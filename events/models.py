from django.db import models
from django.db.models import F, Q

from core.models import ChangeLoggedModel


class EventEnvelope(ChangeLoggedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETE = "complete", "Complete"
        FAILED = "failed", "Failed"

    topic = models.CharField(max_length=120)
    queue_name = models.CharField(max_length=80, blank=True)
    handler_name = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payload = models.JSONField(default=dict, blank=True)
    available_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.CheckConstraint(
                condition=Q(processed_at__isnull=True)
                | Q(available_at__isnull=True)
                | Q(processed_at__gte=F("available_at")),
                name="event_envelope_processing_window_valid",
            ),
        ]

    def __str__(self) -> str:
        return self.topic


class EventAttempt(ChangeLoggedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETE = "complete", "Complete"
        FAILED = "failed", "Failed"

    envelope = models.ForeignKey(EventEnvelope, on_delete=models.CASCADE, related_name="attempts")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    attempt_number = models.PositiveIntegerField(default=1)
    duration_ms = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("envelope", "attempt_number"),
                name="unique_event_attempt_number_per_envelope",
            ),
            models.CheckConstraint(
                condition=Q(finished_at__isnull=True) | Q(finished_at__gte=F("started_at")),
                name="event_attempt_date_range_valid",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.envelope} · attempt {self.attempt_number}"
