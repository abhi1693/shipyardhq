from django.db import models

from core.models import ChangeLoggedModel, OrganizationalModel


class UseCase(OrganizationalModel):
    categories = models.ManyToManyField(
        "catalog.Category",
        through="catalog.UseCaseCategory",
        related_name="use_cases",
        blank=True,
    )


class UseCaseCategory(ChangeLoggedModel):
    use_case = models.ForeignKey("catalog.UseCase", related_name="category_links", on_delete=models.CASCADE)
    category = models.ForeignKey("catalog.Category", related_name="use_case_links", on_delete=models.CASCADE)

    class Meta:
        ordering = ("use_case__name",)
        constraints = [
            models.UniqueConstraint(fields=("use_case", "category"), name="unique_use_case_category"),
        ]
        indexes = [
            models.Index(fields=("category", "use_case")),
            models.Index(fields=("use_case", "category")),
        ]

    def __str__(self):
        return f"{self.use_case} in {self.category}"
