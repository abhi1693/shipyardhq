from django.http import HttpResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.views.generic import View


class PlainTextView(View):
    content_type = "text/plain; charset=utf-8"
    body = ""

    def get(self, request, *args, **kwargs):
        return HttpResponse(self.body, content_type=self.content_type)


class NamespaceRootRedirectView(View):
    target_view_name = ""

    def get(self, request, *args, **kwargs):
        return redirect(reverse(self.target_view_name))
