from django import template

from catalog.category_icons import render_category_icon

register = template.Library()


@register.simple_tag
def category_icon(icon, class_name="category-icon"):
    return render_category_icon(icon, class_name)
