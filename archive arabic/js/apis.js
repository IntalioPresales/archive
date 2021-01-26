function recognize_face(photo, threshold = 70, predictions = 1, location = null, engine = null) {
    return $.ajax({
        url: FACE_URL + `api/recognition/?threshold=${threshold}&predictions=${predictions}&${location ? 'location=' + location : ''}&${engine ? 'engine=' + engine : ''}`,
        method: 'POST',
        accept: "application/json",
        data: _base64ToArrayBuffer(photo),
        processData: false,
        contentType: false
    });
}

function enroll_face(photo, first_name, last_name) {
    return new Promise((resolve, reject) => {
        return $.ajax({
            url: FACE_URL + `api/face/`,
            method: 'POST',
            accept: "application/json",
            contentType: 'application/json',
            data: JSON.stringify({first_name, last_name}),
        }).done(data => {
            add_face(photo, data['id']).done(_ => {
                resolve();
            }).fail(_ => {
                reject()
            })
        });
    })
}

function add_face(photo, id) {
    return $.ajax({
        url: FACE_URL + `api/face/${id}/photo/`,
        method: 'POST',
        accept: "application/json",
        data: photo,
        processData: false,
        contentType: false
    });
}

function _base64ToArrayBuffer(base64) {
    let binary_string = window.atob(base64.split(',')[1]);
    let len = binary_string.length;
    let bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

function capture(video, location) {
    let coords_str = location.split(',');
    let coords_num = [];
    coords_str.forEach(function (coord) {
        coords_num.push(parseInt(coord));
    });

    let top, right, bottom, left;
    if (coords_num[1] < coords_num[3]) {
        // left top right bottom
        left = coords_num[0];
        top = coords_num[1];
        right = coords_num[2];
        bottom = coords_num[3];
    } else {
        // top right bottom left
        top = coords_num[0];
        right = coords_num[1];
        bottom = coords_num[2];
        left = coords_num[3];
    }

    let width = right - left;
    let height = bottom - top;

    let canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(video, left, top, width, height, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg');
}

function search(query, groups = [], fields = [], fq = [], group_limit = 1, start = 0, rows = 1000, collections=['Demo', 'ru', 'egy']) {
    let groupFields = '';
    groups.forEach(f => groupFields += '&group.field=' + f);
    return $.ajax({
        url: SOLR_URL + 'select?q=' + (query ? query : '*:*') +
            (groups.length ? '&group=true' + groupFields + '&group.limit=' + group_limit : '&group=false') +
            (fields ? '&fl=' + fields : '') + (fq ? '&fq=' + fq.join('&fq=') : '') + '&rows=' + rows + '&start=' + start + (collections? '&fq=collection:(' + collections.join(' OR ') + ')': ''),
        method: 'GET',
    });
}

function getTopFaces() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: SOLR_URL + 'select?=&facet.pivot=full_name,face_id,face_photo_url&facet=on&q=collection:Demo&fq=media_type:face&&rows=0',
            method: 'GET',
        }).done(response => {
            return resolve(response['facet_counts']['facet_pivot']['full_name,face_id,face_photo_url'])
        }).fail(error => {
            reject(error);
        })
    });
}

function suggestSeries(query) {
    return $.ajax({
        url: SOLR_URL + 'select?facet=true&facet.field=collection&rows=0&q=collection:*' + query + '*',
        method: 'GET',
    });
}

function deleteOccurrence(cs_uid) {
    return $.ajax({
        url: SOLR_URL + 'update?commit=true',
        method: 'POST',
        processData: false,
        contentType: 'text/xml',
        dataType: 'text',
        data: '<delete><query>cs_uid:"' + cs_uid + '"</query></delete>'
    })
}

function reProcessFace(file_id, time) {
    return $.ajax({
        url: ISEEQ_URL + `api/file/${file_id}/frame/${time}/face?emotion=true`,
        method: 'PUT',
    })
}

function searchPivot(faces, text, objects, use_dictionary = false) {
    let query = faces.length ?
        (use_dictionary ? 'full_name_syn:("' : 'full_name:("') + faces.join('" OR "') + '") OR ' : '';
    query += text.length ? 'exact_text:(' + text.map(x => '*' + x + '*').join(' OR ') + ') OR ' : '';
    query += objects.length ?
        (use_dictionary ? 'name_syn:("' : 'name:("') + objects.join('" OR "') + '") ' : '';

    if (query.endsWith(' OR ')) {
        query += '_DELIMITER_';
        query = query.replace(' OR _DELIMITER_', '');
    }

    if (!query)
        query = '*:*';

    // Filter based on selected video types
    const series_checked = $('#video-category-series').is(':checked');
    const reports_checked = $('#video-category-report').is(':checked');
    const add_filter_query = series_checked || reports_checked;

    let url = SOLR_URL + 'advanced2?rows=0&q=' + query + `&distance=${distance}&optimization=-1&face_count=${faces.length}&object_count=${objects.length}&text_count=${text.length}&facet.limit=-1&facet=true&facet.pivot=file,collection,file_id,full_name,occurrence_time,face_id,face_photo_url&facet.pivot=file,collection,file_id,exact_text,occurrence_time&facet.pivot=file,collection,file_id,name,occurrence_time`;
    const seriesSearch = $('#advanced-search-series').val();
    url += seriesSearch ? '&fq=collection:"' + seriesSearch + '"' : '';
    if (add_filter_query) {
        url += '&fq=category:' + (series_checked ? 'series' : 'report');
    }

    let filter_genre;
    if (genres.length) {
        filter_genre = 'genre:(';
        for (const genre of genres) {
            filter_genre += genre + ' OR ';
        }

        filter_genre += ')';
        filter_genre = filter_genre.replace(' OR )', ')');
        url += '&fq=' + filter_genre;
    }

    let filter_emotion;
    if (emotions.length) {
        filter_emotion = 'emotion:(';
        for (const emotion of emotions) {
            filter_emotion += emotion + ' OR ';
        }

        filter_emotion += ')';
        filter_emotion = filter_emotion.replace(' OR )', ')');
        url += '&fq=' + filter_emotion;
    }

    // const from_year = parseInt($('#production-year-from').val());
    // const to_year = parseInt($('#production-year-to').val());
    // if (from_year) {
    //     url += '&fq=release_year:[' + from_year + ' TO *]';
    // }
    // if (to_year) {
    //     url += '&fq=release_year:[* TO ' + to_year + ']';
    // }

    if (use_dictionary)
        url += '&dictionary=true';

    return $.ajax({
        url: url,
        method: 'GET',
    });
}

function insertQuery(query) {
    $.ajax({
        url: SOLR_URL + 'update/json/docs?commit=true',
        method: 'POST',
        processData: false,
        contentType: 'application/json',
        data: JSON.stringify({
            "cs_uid": "query_" + query.replace(/ /g, ''),
            "query": query
        })
    });
}

function searchQueries(query) {
    return $.ajax({
        url: SOLR_URL + 'select?start=0&rows=3&q=query:' + query
    });
}

function getVideoInfo(binary, file_id, options) {
    let strings = [];
    for (let key in options) {
        if (options[key])
            strings.push(key + '=' + options[key])
    }
    return $.ajax({
        method: 'POST',
        url: ISEEQ_URL + `api/file/${file_id}?${strings.join('&')}`,
        data: binary,
        contentType: false,
        processData: false
    });
}

function getFaceEngines() {
    return $.ajax({
        method: 'GET',
        url: FACE_URL + `api/engine/`,
    });
}

function getCollections() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: SOLR_URL + 'select?facet.field=collection&facet=on',
            method: 'GET',
        }).done(response => {
            return resolve(response['facet_counts']['facet_fields']['collection'].filter(x => typeof x === 'string'))
        }).fail(error => {
            reject(error);
        })
    });
}

function getSRT(file_id) {
    return $.ajax({
        url: `${ISEEQ_URL}api/file/${file_id}/transcription`,
        method: 'GET',
    });
}

function deleteVideo(file_id) {
    return $.ajax({
        url: ISEEQ_URL + `api/file/` + file_id,
        method: 'DELETE',
    });
}
