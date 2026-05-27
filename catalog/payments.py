from __future__ import annotations

from django.conf import settings
from django.urls import reverse
from django.utils import timezone
from dodopayments import DodoPaymentsError

from billing.dodo import DodoConfigurationError, dodo_client
from billing.models import Plan

from .models import Product


class ProductPaymentError(Exception):
    pass


class ProductPaymentConfigurationError(ProductPaymentError):
    pass


def paid_publish_checkout_available():
    return bool(settings.DODO_API_KEY and get_paid_publish_plans().exists())


def get_paid_publish_plans():
    return (
        Plan.objects.filter(
            is_active=True,
            price_cents__gt=0,
            external_id__isnull=False,
        )
        .exclude(external_id="")
        .order_by("price_cents", "name")
    )


def get_paid_publish_plan(plan_id=None):
    plans = get_paid_publish_plans()
    if plan_id:
        return plans.filter(pk=plan_id).first()
    return plans.first()


def create_paid_publish_checkout(request, product, plan_id=None):
    plan = get_paid_publish_plan(plan_id)
    if not plan:
        raise ProductPaymentConfigurationError("Paid launch is not available yet.")
    if not product.pk:
        raise ProductPaymentError("Save this product before starting paid launch.")
    if product.status == Product.Status.ARCHIVED:
        raise ProductPaymentError("This product cannot be published right now.")
    if product.paid_publish_at:
        raise ProductPaymentError("Paid launch is already confirmed.")

    customer = {"email": product.owner.email}
    customer_name = product.owner.get_full_name()
    if customer_name:
        customer["name"] = customer_name

    return_url = request.build_absolute_uri(
        reverse("member_product_paid_publish_return", kwargs={"pk": product.pk})
    )
    cancel_url = request.build_absolute_uri(reverse("member_product_edit", kwargs={"pk": product.pk}))

    try:
        checkout_args = {
            "product_cart": [{"product_id": plan.external_id, "quantity": 1}],
            "minimal_address": True,
            "customer": customer,
            "metadata": {
                "product_id": str(product.pk),
                "plan_id": str(plan.pk),
                "purpose": "paid_publish",
                "user_id": str(product.owner_id),
            },
            "return_url": return_url,
            "cancel_url": cancel_url,
        }
        if plan.type == Plan.Type.ONE_TIME:
            checkout_args["subscription_data"] = None
        session = dodo_client().checkout_sessions.create(**checkout_args)
    except (DodoConfigurationError, DodoPaymentsError) as exc:
        raise ProductPaymentError("Paid launch could not be started. Try again in a moment.") from exc

    checkout_url = (session.checkout_url or "").strip()
    if not checkout_url:
        raise ProductPaymentError("Paid launch could not be started. Try again in a moment.")

    product.paid_publish_checkout_id = session.session_id
    product.save(update_fields=["paid_publish_checkout_id"])
    return checkout_url


def confirm_paid_publish_return(product, *, payment_id="", subscription_id="", checkout_session_id=""):
    payment_id = payment_id.strip()
    subscription_id = subscription_id.strip()
    checkout_session_id = checkout_session_id.strip()

    if payment_id:
        return confirm_paid_publish_payment(product, payment_id)
    if subscription_id:
        return confirm_paid_publish_subscription(product, subscription_id)
    if checkout_session_id:
        return confirm_paid_publish_checkout_session(product, checkout_session_id)

    raise ProductPaymentError("Payment was not completed.")


def confirm_paid_publish_checkout_session(product, checkout_session_id):
    try:
        session = dodo_client().checkout_sessions.retrieve(checkout_session_id)
    except (DodoConfigurationError, DodoPaymentsError) as exc:
        raise ProductPaymentError("Payment could not be confirmed yet.") from exc

    if session.payment_status != "succeeded" or not session.payment_id:
        raise ProductPaymentError("Payment could not be confirmed yet.")

    return confirm_paid_publish_payment(product, session.payment_id)


def confirm_paid_publish_payment(product, payment_id):
    try:
        payment = dodo_client().payments.retrieve(payment_id)
    except (DodoConfigurationError, DodoPaymentsError) as exc:
        raise ProductPaymentError("Payment could not be confirmed yet.") from exc

    if payment.status != "succeeded":
        raise ProductPaymentError("Payment could not be confirmed yet.")

    plan = _validate_payment_product(product, payment)
    return _mark_paid_publish(
        product,
        plan=plan,
        payment_id=payment.payment_id,
        subscription_id=payment.subscription_id,
    )


def confirm_paid_publish_subscription(product, subscription_id):
    try:
        subscription = dodo_client().subscriptions.retrieve(subscription_id)
    except (DodoConfigurationError, DodoPaymentsError) as exc:
        raise ProductPaymentError("Payment could not be confirmed yet.") from exc

    if str(subscription.status or "").lower() != "active":
        raise ProductPaymentError("Payment could not be confirmed yet.")

    plan = _validate_payment_product(product, subscription)
    return _mark_paid_publish(product, plan=plan, subscription_id=subscription.subscription_id)


def process_dodo_webhook(raw_body, headers):
    if not settings.DODO_WEBHOOK_SECRET:
        raise ProductPaymentConfigurationError("Paid launch is not available yet.")

    try:
        event = dodo_client().webhooks.unwrap(raw_body, headers=headers, key=settings.DODO_WEBHOOK_SECRET)
    except (DodoConfigurationError, DodoPaymentsError) as exc:
        raise ProductPaymentError("Invalid webhook.") from exc

    event_type = getattr(event, "type", "")
    data = getattr(event, "data", None)
    if event_type == "payment.succeeded" and data is not None:
        product, plan = _product_and_plan_from_metadata(data)
        if product and plan:
            _mark_paid_publish(product, plan=plan, payment_id=data.payment_id, subscription_id=data.subscription_id)
    elif event_type == "subscription.active" and data is not None:
        product, plan = _product_and_plan_from_metadata(data)
        if product and plan:
            _mark_paid_publish(product, plan=plan, subscription_id=data.subscription_id)

    return event_type


def _validate_payment_product(product, payment_object):
    metadata_product_id = _metadata_value(payment_object, "product_id")
    if metadata_product_id != str(product.pk):
        raise ProductPaymentError("Payment does not match this product.")
    plan = _plan_from_metadata(payment_object)
    if not plan or not plan.is_active or plan.price_cents <= 0:
        raise ProductPaymentError("Payment does not match this product.")
    return plan


def _product_and_plan_from_metadata(payment_object):
    product_id = _metadata_value(payment_object, "product_id")
    if not product_id:
        return None, None
    try:
        product = Product.objects.get(pk=product_id)
    except (Product.DoesNotExist, ValueError):
        return None, None
    return product, _plan_from_metadata(payment_object)


def _plan_from_metadata(payment_object):
    plan_id = _metadata_value(payment_object, "plan_id")
    if not plan_id:
        return None
    try:
        return Plan.objects.get(pk=plan_id, is_active=True)
    except (Plan.DoesNotExist, ValueError):
        return None


def _metadata_value(payment_object, key):
    metadata = getattr(payment_object, "metadata", None) or {}
    if hasattr(metadata, "model_dump"):
        metadata = metadata.model_dump()

    value = metadata.get(key)
    if value:
        return str(value)
    return ""


def _mark_paid_publish(product, *, plan, payment_id=None, subscription_id=None):
    now = timezone.now()
    update_fields = ["paid_publish_at", "plan", "plan_assigned_at"]
    if not product.paid_publish_at:
        product.paid_publish_at = now
    product.plan = plan
    product.plan_assigned_at = product.plan_assigned_at or now

    if payment_id and product.paid_publish_payment_id != payment_id:
        product.paid_publish_payment_id = payment_id
        update_fields.append("paid_publish_payment_id")

    if subscription_id and product.paid_publish_subscription_id != subscription_id:
        product.paid_publish_subscription_id = subscription_id
        update_fields.append("paid_publish_subscription_id")

    if product.status != Product.Status.ARCHIVED:
        product.status = Product.Status.PUBLISHED
        update_fields.append("status")
        if not product.published_at:
            product.published_at = now
            update_fields.append("published_at")
        if not product.submitted_at:
            product.submitted_at = now
            update_fields.append("submitted_at")

    product.save(update_fields=sorted(set(update_fields)))
    return product
