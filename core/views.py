from django.http import JsonResponse
from django.shortcuts import render
from django.views import View
from django.views.generic import TemplateView


class HomeView(TemplateView):
    template_name = "core/home.html"


class HealthView(View):
    def get(self, request):
        return JsonResponse({"ok": True})


def handler_404(request, exception):
    return render(request, "core/404.html", status=404)


def handler_500(request):
    return render(request, "core/500.html", status=500)
