from django.http import JsonResponse
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import TemplateView

from catalog.payments import ProductPaymentConfigurationError, ProductPaymentError, process_dodo_webhook


class HomeView(TemplateView):
    template_name = "core/home.html"


class HealthView(View):
    def get(self, request):
        return JsonResponse({"ok": True})


@method_decorator(csrf_exempt, name="dispatch")
class DodoWebhookView(View):
    http_method_names = ["post"]

    def post(self, request):
        try:
            event_type = process_dodo_webhook(request.body.decode("utf-8"), dict(request.headers.items()))
        except UnicodeDecodeError:
            return JsonResponse({"error": "invalid payload"}, status=400)
        except ProductPaymentConfigurationError:
            return JsonResponse({"error": "not configured"}, status=400)
        except ProductPaymentError:
            return JsonResponse({"error": "invalid webhook"}, status=400)

        return JsonResponse({"ok": True, "event": event_type})


def handler_404(request, exception):
    return render(request, "core/404.html", status=404)


def handler_500(request):
    return render(request, "core/500.html", status=500)
