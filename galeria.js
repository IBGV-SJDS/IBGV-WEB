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

    const { data: albums, error } =
      await db
        .from('albums')
        .select('*')
        .eq('visible', true)
        .order('sort_order')
        .order('created_at', { ascending:false });


    const container =
      document.getElementById('album-list');


    if (error) {

      container.innerHTML =
        '<p class="muted">No fue posible cargar los álbumes.</p>';

      return;

    }


    if (!albums?.length) {

      container.innerHTML =
        '<p class="muted">Próximamente compartiremos nuestros álbumes.</p>';

      return;

    }


    container.innerHTML =
      albums.map(x => {

        const cover =
          safeUrl(x.cover_url);

        const album =
          safeUrl(x.album_url);


        return `

          <figure>

            ${
              cover !== '#'
                ? `<img
                     loading="lazy"
                     src="${cover}"
                     alt="${esc(x.title)}">`
                : ''
            }

            <figcaption>

              <strong>
                ${esc(x.title)}
              </strong>

              ${
                x.description
                  ? `<p>${esc(x.description)}</p>`
                  : ''
              }

              ${
                album !== '#'
                  ? `<a
                       class="btn secondary"
                       target="_blank"
                       rel="noopener noreferrer"
                       href="${album}">
                       Ver álbum →
                     </a>`
                  : ''
              }

            </figcaption>

          </figure>

        `;

      }).join('');

  })();

}
