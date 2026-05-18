import uuid

from core.request_tracking import reset_current_request, set_current_request


class RequestTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.id = uuid.uuid4()
        token = set_current_request(request)
        try:
            response = self.get_response(request)
        finally:
            reset_current_request(token)

        response["X-Request-ID"] = str(request.id)
        return response
