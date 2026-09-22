from django.db import models


class Restaurant(models.Model):
    name = models.CharField(max_length=200)
    latitude = models.FloatField()
    longitude = models.FloatField()
    cuisine = models.CharField(
        max_length=100,
        blank=True,
    )

    def __str__(self):
        return self.name