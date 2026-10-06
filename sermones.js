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

    const { data: sermons, error } =
      await db
        .from('sermons')
        .select('*')
        .order('preached_on', { ascending:false })
        .order('created_at', { ascending:false });


    const container =
      document.getElementById('sermon-list');


    if (error) {

      container.innerHTML =
        '<p class="muted">No fue posible cargar los sermones.</p>';

      return;
    }


    if (!sermons?.length) {

      container.innerHTML =
        '<p class="muted">Próximamente encontrarás aquí nuestras predicaciones.</p>';

      return;
    }


    const groups = {};


    sermons.forEach(x => {

      const book =
        (x.book || 'Otros').trim() || 'Otros';

      (groups[book] ??= []).push(x);

    });


    container.innerHTML =
      Object.entries(groups)
        .map(([book, items]) => `

          <section class="sermon-group">

            <h2 class="sermon-book">
              ${esc(book)}
            </h2>

            <div class="cards">

              ${items.map(x => {

                const video =
                  safeUrl(x.youtube_url);

                let date = '';

                if (x.preached_on) {
                  const parts =
                    x.preached_on.split('-');

                  if (parts.length === 3) {
                    date =
                      `${parts[2]}/${parts[1]}/${parts[0]}`;
                  }
                }

                return `

                  <article class="card">

                    <h3>
                      ${esc(x.title)}
                    </h3>

                    ${
                      x.series
                        ? `<p class="series-tag">
                             Serie: ${esc(x.series)}
                           </p>`
                        : ''
                    }

                    ${
                      x.passage
                        ? `<p><strong>
                             ${esc(x.passage)}
                           </strong></p>`
                        : ''
                    }

                    ${
                      x.preacher
                        ? `<p>
                             Predicador: ${esc(x.preacher)}
                           </p>`
                        : ''
                    }

                    ${
                      date
                        ? `<p class="sermon-date">
                             ${esc(date)}
                           </p>`
                        : ''
                    }

                    ${
                      video !== '#'
                        ? `<a
                             class="btn"
                             target="_blank"
                             rel="noopener noreferrer"
                             href="${video}">
                             Ver sermón
                           </a>`
                        : ''
                    }

                  </article>

                `;

              }).join('')}

            </div>

          </section>

        `).join('');

  })();

}
