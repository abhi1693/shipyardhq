import django_tables2 as tables


class BaseTable(tables.Table):
    def configure(self, request, per_page=25):
        tables.RequestConfig(request, paginate={"per_page": per_page}).configure(self)
        return self

    class Meta:
        attrs = {
            "class": "ship-table",
        }
        empty_text = "No records found."
        order_by = ()


class PrimaryModelTable(BaseTable):
    class Meta(BaseTable.Meta):
        pass
