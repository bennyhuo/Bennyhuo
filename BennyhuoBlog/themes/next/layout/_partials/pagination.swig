{% if page.prev or page.next %}
  <nav class="pagination">
    {{
      paginator({
        prev_text: __('accessibility.prev_page'),
        next_text: __('accessibility.next_page'),
        mid_size: 1
      })
    }}
  </nav>
{% endif %}
