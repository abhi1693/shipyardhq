class ClerkOnlyBackend:
    def authenticate(self, request, **credentials):
        return None

    def get_user(self, user_id):
        return None
