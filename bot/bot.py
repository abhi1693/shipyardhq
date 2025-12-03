#!/usr/bin/env python3
"""
Lightweight Twitter helper bot.

Features:
- Continuously polls recent tweets matching provided keywords (1+).
- Drafts short replies with OpenAI (<=200 chars).
- Replies can be a question, a helpful tip, or—preferably—a reasoned suggestion
  to list their app on https://shipyardhq.dev.
- Interactive approval per tweet (yes/regenerate/skip) unless --yes is supplied.
- Processes one tweet at a time and sleeps between polls to avoid rate limits.
- Skips tweets that already have a reply from the authenticated user (checked via search).
- Twitter auth: OAuth2 user bearer token with tweet.write OR OAuth1.0a user tokens.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from dataclasses import dataclass
from typing import List, Optional

import requests
from openai import OpenAI
from requests_oauthlib import OAuth1


SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent"
POST_URL = "https://api.twitter.com/2/tweets"
ME_URL = "https://api.twitter.com/2/users/me"


def build_query(keywords: List[str]) -> str:
    """Build a Twitter search query with OR'ed keywords and basic filters."""
    keyword_clause = " OR ".join(f"\"{kw.strip()}\"" for kw in keywords if kw.strip())
    filters = "-is:retweet -is:reply lang:en"
    return f"({keyword_clause}) {filters}".strip()


@dataclass
class Tweet:
    id: str
    text: str
    created_at: Optional[str] = None
    conversation_id: Optional[str] = None


class TwitterClient:
    def __init__(
        self,
        bearer_token: Optional[str] = None,
        consumer_key: Optional[str] = None,
        consumer_secret: Optional[str] = None,
        access_token: Optional[str] = None,
        access_token_secret: Optional[str] = None,
        debug: bool = False,
    ) -> None:
        self.session = requests.Session()
        self.debug = debug

        self.auth: Optional[OAuth1] = None
        self.me_id: Optional[str] = None
        self.me_username: Optional[str] = None
        if consumer_key and consumer_secret and access_token and access_token_secret:
            # OAuth1 user-context
            self.auth = OAuth1(
                consumer_key,
                consumer_secret,
                access_token,
                access_token_secret,
                signature_type="auth_header",
            )
            logging.info("Using OAuth1 user tokens for Twitter (tweet.write required).")
        elif bearer_token:
            # OAuth2 user bearer token
            self.session.headers.update(
                {"Authorization": f"Bearer {bearer_token}", "Content-Type": "application/json"}
            )
            logging.info("Using OAuth2 bearer token for Twitter (must be user-context).")
        else:
            logging.error(
                "No Twitter credentials provided. Supply OAuth1 user tokens or a user-context bearer token."
            )
            sys.exit(1)

        self._load_identity()

    def search_recent(self, query: str, since_id: Optional[str]) -> List[Tweet]:
        params = {
            "query": query,
            "tweet.fields": "author_id,created_at,conversation_id",
            "max_results": 10,
        }
        if since_id:
            params["since_id"] = since_id

        resp = self.session.get(SEARCH_URL, params=params, timeout=30, auth=self.auth)
        if self.debug:
            logging.debug("Search params: %s", params)
            logging.debug("Search response status: %s", resp.status_code)
            logging.debug("Search response body: %s", resp.text)

        if resp.status_code == 429:
            reset_after = rate_limit_sleep(resp)
            logging.warning("Hit search rate limit, sleeping %s seconds", reset_after)
            time.sleep(reset_after)
            return []

        resp.raise_for_status()
        data = resp.json().get("data", [])
        tweets: List[Tweet] = []
        for item in data:
            tweets.append(
                Tweet(
                    id=item["id"],
                    text=item.get("text", ""),
                    created_at=item.get("created_at"),
                    conversation_id=item.get("conversation_id"),
                )
            )
        return tweets

    def reply(self, tweet_id: str, text: str) -> bool:
        payload = {"text": text, "reply": {"in_reply_to_tweet_id": tweet_id}}
        resp = self.session.post(POST_URL, json=payload, timeout=30, auth=self.auth)
        if self.debug:
            logging.debug("Reply payload: %s", payload)
            logging.debug("Reply response status: %s", resp.status_code)
            logging.debug("Reply response body: %s", resp.text)

        if resp.status_code == 429:
            reset_after = rate_limit_sleep(resp)
            logging.warning("Hit reply rate limit, sleeping %s seconds", reset_after)
            time.sleep(reset_after)
            return False

        try:
            resp.raise_for_status()
        except requests.HTTPError:
            try:
                body = resp.json()
            except ValueError:
                body = resp.text
            logging.error("Reply failed (%s): %s", resp.status_code, body)
            if resp.status_code == 403 and "unsupported-authentication" in str(body).lower():
                logging.error(
                    "Twitter requires user-context auth for posting. "
                    "Use an OAuth 2.0 user access token (tweet.write scope) or OAuth 1.0a user tokens instead of app-only bearer. "
                    "Set TWITTER_BEARER_TOKEN to that user token."
                )
            return False

        logging.info("Replied successfully to tweet %s", tweet_id)
        return True

    def _load_identity(self) -> None:
        try:
            resp = self.session.get(ME_URL, timeout=30, auth=self.auth)
            if resp.status_code == 429:
                reset_after = rate_limit_sleep(resp)
                logging.warning("Rate limited loading identity, sleeping %s seconds", reset_after)
                time.sleep(reset_after)
                return
            resp.raise_for_status()
            data = resp.json().get("data", {})
            self.me_id = data.get("id")
            self.me_username = data.get("username")
            if self.me_username:
                logging.info("Authenticated as @%s (id %s)", self.me_username, self.me_id)
        except Exception as exc:
            logging.warning("Could not load Twitter identity: %s", exc)

    def has_replied(self, tweet: Tweet) -> bool:
        if not tweet.conversation_id or not self.me_username:
            return False
        query = f"conversation_id:{tweet.conversation_id} from:{self.me_username}"
        params = {
            "query": query,
            "tweet.fields": "author_id,conversation_id",
            "max_results": 10,
        }
        resp = self.session.get(SEARCH_URL, params=params, timeout=30, auth=self.auth)
        if self.debug:
            logging.debug("Reply-check params: %s", params)
            logging.debug("Reply-check status: %s", resp.status_code)
            logging.debug("Reply-check body: %s", resp.text)
        if resp.status_code == 429:
            reset_after = rate_limit_sleep(resp, default_seconds=30, max_seconds=300)
            logging.warning("Hit rate limit checking replies, sleeping %s seconds", reset_after)
            time.sleep(reset_after)
            return False
        if resp.status_code == 403:
            logging.warning("Missing permission to check replies; continuing without skip.")
            return False
        resp.raise_for_status()
        data = resp.json().get("data", [])
        return len(data) > 0


def draft_reply(client: OpenAI, tweet: Tweet) -> str:
    """Generate a concise reply for a tweet."""
    system = (
        "You craft concise, kind replies to tweets. "
        "Each reply must be under 200 characters. "
        "Reply types: curious question, helpful tip, or a suggestion to list their app on https://shipyardhq.dev. "
        "When you suggest Shipyard, include the URL https://shipyardhq.dev and tie it to their post with a short reason. "
        "No hashtags or emojis. Keep it human and specific."
    )
    user_prompt = (
        "Tweet text:\n"
        f"{tweet.text}\n\n"
        "Write one reply that follows the rules above."
    )
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.5,
        max_tokens=120,
    )
    reply = completion.choices[0].message.content.strip().replace("\n", " ")
    lower_reply = reply.lower()
    if "shipyard" in lower_reply and "shipyardhq.dev" not in lower_reply:
        reply = f"{reply} https://shipyardhq.dev"

    if len(reply) > 200:
        reply = reply[:197].rstrip() + "..."
    return reply


def require_env(name: str) -> str:
    value = os.getenv(name)
    if value:
        return value
    logging.error("Missing required environment variable: %s", name)
    sys.exit(1)


def first_env(*names: str) -> Optional[str]:
    for name in names:
        val = os.getenv(name)
        if val:
            return val
    return None


def rate_limit_sleep(resp: requests.Response, default_seconds: int = 60, max_seconds: int = 900) -> int:
    """
    Calculate a sleep duration using Twitter's x-rate-limit-reset header.
    The header is a UNIX timestamp in seconds; we convert to a delta from now,
    clamp to max_seconds, and fall back to default_seconds when missing.
    """
    reset_header = resp.headers.get("x-rate-limit-reset")
    if reset_header:
        try:
            reset_ts = float(reset_header)
            now = time.time()
            delta = max(0, int(reset_ts - now) + 1)
            return min(max(delta, default_seconds), max_seconds)
        except (ValueError, TypeError):
            pass
    return default_seconds


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Twitter helper bot for Shipyard mentions and tips.")
    parser.add_argument("keywords", nargs="+", help="One or more keywords to search for.")
    parser.add_argument("--yes", action="store_true", help="Auto-approve all generated replies.")
    parser.add_argument("--debug", action="store_true", help="Enable verbose logging.")
    parser.add_argument(
        "--interval",
        type=int,
        default=90,
        help="Seconds to sleep between search polls (default: 90).",
    )
    parser.add_argument(
        "--pause",
        type=int,
        default=8,
        help="Seconds to sleep between handling individual tweets (default: 8).",
    )
    return parser.parse_args()


def handle_tweet(
    twitter: TwitterClient,
    ai_client: OpenAI,
    tweet: Tweet,
    auto_yes: bool,
) -> None:
    if twitter.has_replied(tweet):
        logging.info("Already replied to tweet %s; skipping.", tweet.id)
        return

    reply_text = draft_reply(ai_client, tweet)
    approved = auto_yes

    if not auto_yes:
        while True:
            print("\n--- Tweet ------------------------------------")
            print(tweet.text)
            print("-----------------------------------------------")
            print(f"Draft reply: {reply_text}")
            choice = input("Reply? (yes/regenerate): ").strip().lower()
            if choice.startswith("y"):
                approved = True
                break
            if choice.startswith("r"):
                reply_text = draft_reply(ai_client, tweet)
                continue
            approved = False
            break

    if not approved:
        logging.info("Skipped replying to tweet %s", tweet.id)
        return

    success = twitter.reply(tweet.id, reply_text)
    if not success:
        logging.warning("Did not post reply to tweet %s", tweet.id)


def main() -> None:
    args = parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    openai_key = require_env("OPENAI_API_KEY")

    # Twitter auth: prefer OAuth1 user tokens when all are provided; otherwise fall back to OAuth2 user bearer.
    consumer_key = first_env("TWITTER_API_KEY", "TWITTER_CONSUMER_KEY")
    consumer_secret = first_env("TWITTER_API_SECRET", "TWITTER_CONSUMER_SECRET")
    access_token = first_env("TWITTER_ACCESS_TOKEN", "TWITTER_OAUTH_TOKEN")
    access_token_secret = first_env("TWITTER_ACCESS_TOKEN_SECRET", "TWITTER_OAUTH_TOKEN_SECRET")
    bearer_token = os.getenv("TWITTER_BEARER_TOKEN")

    twitter_client = TwitterClient(
        bearer_token=bearer_token,
        consumer_key=consumer_key,
        consumer_secret=consumer_secret,
        access_token=access_token,
        access_token_secret=access_token_secret,
        debug=args.debug,
    )
    ai_client = OpenAI(api_key=openai_key)

    query = build_query(args.keywords)
    logging.info("Watching for tweets matching: %s", query)

    since_id: Optional[str] = None
    try:
        while True:
            tweets = twitter_client.search_recent(query, since_id=since_id)
            if tweets:
                tweets = sorted(tweets, key=lambda t: int(t.id))
                for tweet in tweets:
                    since_id = tweet.id if since_id is None else str(max(int(since_id), int(tweet.id)))
                    handle_tweet(twitter_client, ai_client, tweet, auto_yes=args.yes)
                    logging.debug("Sleeping %s seconds between tweets", args.pause)
                    time.sleep(args.pause)
            else:
                logging.debug("No new tweets this round.")

            logging.info("Sleeping %s seconds before next poll", args.interval)
            time.sleep(args.interval)
    except KeyboardInterrupt:
        logging.info("Bot stopped by user.")


if __name__ == "__main__":
    main()
