from contextvars import ContextVar

current_request = ContextVar("current_request", default=None)


def set_current_request(request):
    return current_request.set(request)


def reset_current_request(token) -> None:
    current_request.reset(token)


def get_current_request():
    return current_request.get()
