const c = window.IBGV_CONFIG || {},
  ok = c.SUPABASE_URL && !c.SUPABASE_URL.startsWith('PEGA_');

let db;
let editingLeaderId = null;
let editingLeaderPhotoUrl = null;

const esc = (v = '') =>
  String(v).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));

const normalizeUrl = (v = '') => {
  let x = String(v).trim();

  if (!x) return '';

  if (!/^https?:\/\//i.test(x))
    x = 'https://' + x;

  try {
    const u = new URL(x);

    return ['http:', 'https:'].includes(u.protocol)
      ? u.href
      : '';
  } catch {
    return '';
  }
};


/* =========================
   INICIO Y AUTENTICACIÓN
========================= */

if (!ok) {

  setup.style.display = 'block';
  loginBtn.disabled = true;

} else {

  db = supabase.createClient(
    c.SUPABASE_URL,
    c.SUPABASE_ANON_KEY
  );

  init();
}


async function init() {

  const {
    data: { session }
  } = await db.auth.getSession();

  render(session);

  db.auth.onAuthStateChange((_e, s) => render(s));
}


function render(s) {

  login.hidden = !!s;
  dashboard.hidden = !s;

  if (s) {
    loadSettings();
    loadSermons();
    loadLeaders();
    loadAlbums();
  }
}


loginBtn.onclick = async () => {

  let { error } =
    await db.auth.signInWithPassword({
      email: email.value,
      password: password.value
    });

  msg.textContent =
    error ? error.message : '';
};


logout.onclick = () =>
  db.auth.signOut();


/* =========================
   CONFIGURACIÓN
========================= */

const settingKeys = [
  'about',
  'sunday',
  'wednesday',
  'address',
  'whatsapp',
  'lunch_text',
  'maps_url',
  'facebook_url',
  'youtube_url',
  'instagram_url',
  'other_social_url'
];


async function loadSettings() {

  let { data } =
    await db
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

  if (data) {

    settingKeys.forEach(k => {

      const el =
        document.getElementById(k);

      if (el)
        el.value = data[k] || '';

    });

    lunch_enabled.checked =
      data.lunch_enabled !== false;
  }
}


saveSettings.onclick = async () => {

  let payload = {
    id: 1,
    lunch_enabled: lunch_enabled.checked
  };

  settingKeys.forEach(k =>
    payload[k] =
      document.getElementById(k).value
  );

  [
    'maps_url',
    'facebook_url',
    'youtube_url',
    'instagram_url',
    'other_social_url'
  ].forEach(k => {

    if (payload[k])
      payload[k] =
        normalizeUrl(payload[k]);

  });

  let { error } =
    await db
      .from('settings')
      .upsert(payload);

  alert(
    error
      ? error.message
      : 'Cambios guardados'
  );
};


/* =========================
   SERMONES
========================= */

addSermon.onclick = async () => {

  if (!title.value.trim())
    return alert('Escribe el título.');

  const yt =
    normalizeUrl(youtube.value);

  if (youtube.value.trim() && !yt)
    return alert(
      'El enlace de YouTube no es válido.'
    );

  let payload = {

    title: title.value.trim(),
    passage: passage.value.trim(),
    book: book.value.trim(),
    series: series.value.trim(),
    preacher: preacher.value.trim(),
    preached_on:
      preached_on.value || null,
    youtube_url: yt

  };

  let { error } =
    await db
      .from('sermons')
      .insert(payload);

  if (error)
    return alert(error.message);

  title.value =
    passage.value =
    book.value =
    series.value =
    preacher.value =
    preached_on.value =
    youtube.value = '';

  loadSermons();
};


async function loadSermons() {

  let { data } =
    await db
      .from('sermons')
      .select('*')
      .order(
        'created_at',
        { ascending: false }
      );

  document
    .getElementById('admin-sermons')
    .innerHTML =
      (data || []).map(x => `

        <div class="row admin-item">

          <span class="grow">

            <b>${esc(x.title)}</b>

            ${esc(x.passage || '')}

            ${
              x.book
                ? ' · ' + esc(x.book)
                : ''
            }

            ${
              x.series
                ? ' · Serie: ' + esc(x.series)
                : ''
            }

          </span>

          <button
            class="btn danger"
            onclick="delSermon('${x.id}')">
            Eliminar
          </button>

        </div>

      `).join('');
}


window.delSermon = async id => {

  if (
    confirm('¿Eliminar este sermón?')
  ) {

    let { error } =
      await db
        .from('sermons')
        .delete()
        .eq('id', id);

    if (error)
      alert(error.message);
    else
      loadSermons();

  }
};


/* =========================
   SUBIR IMÁGENES
========================= */

async function uploadImage(
  file,
  prefix
) {

  if (!file)
    return null;

  const ext =
    (
      file.name
        .split('.')
        .pop() || 'jpg'
    ).toLowerCase();

  const path =
    `${prefix}/${crypto.randomUUID()}.${ext}`;

  const { error } =
    await db.storage
      .from('site-images')
      .upload(
        path,
        file,
        { upsert: false }
      );

  if (error)
    throw error;

  return db.storage
    .from('site-images')
    .getPublicUrl(path)
    .data
    .publicUrl;
}


/* =========================
   ELIMINAR IMAGEN ANTERIOR
========================= */

async function deleteStorageImage(
  publicUrl
) {

  if (!publicUrl)
    return;

  try {

    const marker =
      '/site-images/';

    const pos =
      publicUrl.indexOf(marker);

    if (pos === -1)
      return;

    const path =
      decodeURIComponent(
        publicUrl.substring(
          pos + marker.length
        )
      );

    if (!path)
      return;

    await db.storage
      .from('site-images')
      .remove([path]);

  } catch (e) {

    console.warn(
      'No se pudo borrar la imagen anterior:',
      e
    );

  }
}


/* =========================
   LIDERAZGO
========================= */

addLeader.onclick = async () => {

  try {

    if (!leader_name.value.trim())
      return alert(
        'Escribe el nombre.'
      );


    /*
      SI ESTAMOS EDITANDO
    */

    if (editingLeaderId) {

      let photo_url =
        editingLeaderPhotoUrl;

      const newFile =
        leader_photo.files[0];


      /*
        Si seleccionamos una nueva foto,
        primero la subimos.
      */

      if (newFile) {

        photo_url =
          await uploadImage(
            newFile,
            'leadership'
          );

      }


      const payload = {

        name:
          leader_name.value.trim(),

        role:
          leader_role.value.trim(),

        bio:
          leader_bio.value.trim(),

        photo_url,

        visible:
          leader_visible.checked

      };


      const { error } =
        await db
          .from('leadership')
          .update(payload)
          .eq(
            'id',
            editingLeaderId
          );


      if (error)
        throw error;


      /*
        Solo después de actualizar
        correctamente la base de datos
        eliminamos la foto anterior.
      */

      if (
        newFile &&
        editingLeaderPhotoUrl &&
        editingLeaderPhotoUrl !== photo_url
      ) {

        await deleteStorageImage(
          editingLeaderPhotoUrl
        );

      }


      alert(
        'Liderazgo actualizado correctamente.'
      );

      resetLeaderForm();

      loadLeaders();

      return;
    }


    /*
      SI ESTAMOS AGREGANDO
      UNA PERSONA NUEVA
    */

    const photo_url =
      await uploadImage(
        leader_photo.files[0],
        'leadership'
      );


    const { error } =
      await db
        .from('leadership')
        .insert({

          name:
            leader_name.value.trim(),

          role:
            leader_role.value.trim(),

          bio:
            leader_bio.value.trim(),

          photo_url,

          visible:
            leader_visible.checked

        });


    if (error)
      throw error;


    resetLeaderForm();

    loadLeaders();


  } catch (e) {

    alert(e.message);

  }
};


/* =========================
   CARGAR LIDERAZGO
========================= */

async function loadLeaders() {

  const { data, error } =
    await db
      .from('leadership')
      .select('*')
      .order('sort_order')
      .order('created_at');


  if (error) {

    alert(error.message);
    return;

  }


  document
    .getElementById('admin-leaders')
    .innerHTML =
      (data || []).map(x => `

        <div class="row admin-item">

          <span class="grow">

            <b>${esc(x.name)}</b>

            · ${esc(x.role || '')}

            ${
              x.visible
                ? ''
                : ' (oculto)'
            }

          </span>


          <button
            class="btn secondary"
            onclick="editLeader('${x.id}')">
            Editar
          </button>


          <button
            class="btn"
            onclick="toggleLeader(
              '${x.id}',
              ${!x.visible}
            )">

            ${
              x.visible
                ? 'Ocultar'
                : 'Mostrar'
            }

          </button>


          <button
            class="btn danger"
            onclick="delLeader('${x.id}')">
            Eliminar
          </button>

        </div>

      `).join('');
}


/* =========================
   EDITAR LÍDER
========================= */

window.editLeader = async id => {

  const { data, error } =
    await db
      .from('leadership')
      .select('*')
      .eq('id', id)
      .single();


  if (error) {

    alert(error.message);
    return;

  }


  editingLeaderId =
    data.id;

  editingLeaderPhotoUrl =
    data.photo_url || null;


  leader_name.value =
    data.name || '';

  leader_role.value =
    data.role || '';

  leader_bio.value =
    data.bio || '';

  leader_visible.checked =
    data.visible !== false;


  /*
    Los navegadores no permiten
    colocar automáticamente un archivo
    dentro del selector de archivos.
    Por eso queda vacío hasta que
    el usuario seleccione otra foto.
  */

  leader_photo.value = '';


  addLeader.textContent =
    'Guardar cambios';


  /*
    Llevarnos al formulario
  */

  leader_name.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

};


/* =========================
   LIMPIAR FORMULARIO
========================= */

function resetLeaderForm() {

  editingLeaderId = null;
  editingLeaderPhotoUrl = null;

  leader_name.value = '';
  leader_role.value = '';
  leader_bio.value = '';
  leader_photo.value = '';

  leader_visible.checked = true;

  addLeader.textContent =
    'Agregar persona';
}


/* =========================
   MOSTRAR / OCULTAR
========================= */

window.toggleLeader =
  async (id, v) => {

    const { error } =
      await db
        .from('leadership')
        .update({
          visible: v
        })
        .eq('id', id);

    if (error)
      alert(error.message);
    else
      loadLeaders();

  };


/* =========================
   ELIMINAR LÍDER
========================= */

window.delLeader =
  async id => {

    if (
      confirm(
        '¿Eliminar esta persona del liderazgo?'
      )
    ) {

      const { error } =
        await db
          .from('leadership')
          .delete()
          .eq('id', id);

      if (error) {

        alert(error.message);

      } else {

        /*
          Si estábamos editando justamente
          esa persona, limpiamos formulario.
        */

        if (editingLeaderId === id)
          resetLeaderForm();

        loadLeaders();

      }

    }

  };


/* =========================
   ÁLBUMES
========================= */

addAlbum.onclick = async () => {

  try {

    if (!album_title.value.trim())
      return alert(
        'Escribe el título del álbum.'
      );

    const url =
      normalizeUrl(
        album_url.value
      );

    if (!url)
      return alert(
        'Escribe un enlace válido para el álbum.'
      );


    const cover_url =
      await uploadImage(
        album_cover.files[0],
        'album-covers'
      );


    const { error } =
      await db
        .from('albums')
        .insert({

          title:
            album_title.value.trim(),

          description:
            album_description.value.trim(),

          album_url: url,

          cover_url,

          event_date:
            album_date.value || null,

          visible:
            album_visible.checked

        });


    if (error)
      throw error;


    album_title.value =
      album_description.value =
      album_url.value =
      album_date.value = '';

    album_cover.value = '';

    album_visible.checked = true;

    loadAlbums();


  } catch (e) {

    alert(e.message);

  }
};


async function loadAlbums() {

  const { data, error } =
    await db
      .from('albums')
      .select('*')
      .order('sort_order')
      .order(
        'created_at',
        { ascending: false }
      );


  if (error) {

    document
      .getElementById('admin-albums')
      .innerHTML =
        '<p class="muted">Ejecuta primero upgrade-v5.sql en Supabase.</p>';

    return;

  }


  document
    .getElementById('admin-albums')
    .innerHTML =
      (data || []).map(x => `

        <div>

          ${
            x.cover_url
              ? `<img src="${x.cover_url}" alt="">`
              : ''
          }

          <small>

            <b>${esc(x.title)}</b>

            ${
              x.visible
                ? ''
                : ' (oculto)'
            }

          </small>

          <br>

          <button
            class="btn"
            onclick="toggleAlbum(
              '${x.id}',
              ${!x.visible}
            )">

            ${
              x.visible
                ? 'Ocultar'
                : 'Mostrar'
            }

          </button>

          <button
            class="btn danger"
            onclick="delAlbum('${x.id}')">
            Eliminar
          </button>

        </div>

      `).join('');
}


window.toggleAlbum =
  async (id, v) => {

    const { error } =
      await db
        .from('albums')
        .update({
          visible: v
        })
        .eq('id', id);

    if (error)
      alert(error.message);
    else
      loadAlbums();

  };


window.delAlbum =
  async id => {

    if (
      confirm(
        '¿Eliminar este álbum de la web? El álbum externo no se borrará.'
      )
    ) {

      const { error } =
        await db
          .from('albums')
          .delete()
          .eq('id', id);

      if (error)
        alert(error.message);
      else
        loadAlbums();

    }

  };
