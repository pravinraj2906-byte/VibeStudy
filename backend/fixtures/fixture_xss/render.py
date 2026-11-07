# Fixture B: Unsafe Rendering / DOM Injection
class HtmlRenderer:
    def render_comment(self, user_name: str, comment_text: str) -> str:
        """
        VULNERABLE COMPONENT:
        Directly concatenates unsanitized user comment text into HTML markup
        without escaping special characters or using DOMPurify.
        """
        return f"""
        <div class="comment-card">
            <h4>{user_name}</h4>
            <div class="comment-body">{comment_text}</div>
        </div>
        """
