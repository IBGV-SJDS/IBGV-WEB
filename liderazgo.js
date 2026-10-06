document.getElementById('year').textContent =
  new Date().getFullYear();

const c = window.IBGV_CONFIG || {};

const ready =
  c.SUPABASE_URL &&
  !c.SUPABASE_URL.startsWith('PEGA_');

const esc = (v = '') =>
  String(v).replace(
    /[&<>"']/g,
    m => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[m])
  );

const safeUrl = (v = '') => {
  try {

    let x = String(v).trim();

    if (!x) return '#';

    if (!/^https?:\/\//i.test(x))
      x = 'https://' + x;

    const u = new URL(x);

    return ['http:', 'https:'].includes(u.protocol)
      ? u.href
      : '#';

  } catch {

    return '#';

  }
};


if (ready) {

  const db = supabase.createClient(
    c.SUPABASE_URL,
    c.SUPABASE_ANON_KEY
  );

  (async () => {

    const { data: leaders, error } =
      await db
        .from('leadership')
        .select('*')
        .eq('visible', true)
        .order('sort_order')
        .order('created_at');


    const container =
      document.getElementById('leadership-list');


    if (error) {

      container.innerHTML =
        '<p class="muted">No fue posible cargar la información de liderazgo.</p>';

      return;

    }


    if (!leaders?.length) {

      container.innerHTML =
        '<p class="muted">Información de liderazgo próximamente.</p>';

      return;

    }


    container.innerHTML =
      leaders.map(x => {

        const photo =
          safeUrl(x.photo_url);

        return `

          <article class="card">

            ${
              photo !== '#'
                ? `<img
                     class="leader-photo"
                     src="${photo}"
                     alt="${esc(x.name)}">`
                : ''
            }

            <h3>
              ${esc(x.name)}
            </h3>

            ${
              x.role
                ? `<p><strong>${esc(x.role)}</strong></p>`
                : ''
            }

            ${
              x.bio
                ? `<p>${esc(x.bio)}</p>`
                : ''
            }

          </article>

        `;

      }).join('');

  })();

}
