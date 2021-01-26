const rows = $('#col-main > .dashboard-container > .row');
const search_input = $('#search-box');
const loader = $('#loader-wrapper');
const constSearchForm = $('#video-search-header');
const advancedSearchButton = $('#advanced-search');
const emotion = {
    'angry': '😠',
    'disgust': '😬',
    'sad': '🙁',
    'happy': '😀',
    'surprise': '😀',
    'neutral': '😐',
    'fear': '😨'
};

let currentItem = null;
let currentItemMediaType;
let canvas_already_drawn = false;
let current_top_search_genre;
let current_top_search_face;
let autocomplete_current_iteration;
let autocomplete_delimeter_index;
let current_highlighted_timestamp;
let showing_subtitles = false;
let srt;

const recent_searches_local_json = JSON.parse(localStorage.getItem('recent_searches_local'));
let recent_searches_local = recent_searches_local_json ? recent_searches_local_json : [];

search_input.on('keyup', onSearchBoxEnter);

function onSearchBoxEnter(e, clicked_suggestion) {
    if (e.keyCode === 13) {
        clearAdvancedSearch();

        if (clicked_suggestion)
            search_input.val(clicked_suggestion);

        let searchValue = search_input.val().trim();
        if (recent_searches_local.includes(searchValue))
            recent_searches_local.splice(recent_searches_local.indexOf(searchValue), 1);

        insertQuery(searchValue.trim());

        recent_searches_local.push(searchValue);
        localStorage.setItem('recent_searches_local', JSON.stringify(recent_searches_local));

        loader.show();
        if (searchValue.split().length === 1)
            getGroups(searchValue);
        else
            getSentenceFaces(searchValue).then(data => {
                if (data.faces.length)
                    advancedSearch(searchValue, data.faces, [], data.objects, true);
                else {
                    $('#above-dot-row-wrapper+.row').html('');
                    resetStatusBar();
                    getGroups(searchValue);
                }
            }).catch(error => {
                $('#above-dot-row-wrapper+.row').html('');
                resetStatusBar();
                getGroups(searchValue);
            });
    }
}

function clearAdvancedSearch() {
    $('#advanced-search-faces > span > div').each(function () {
        const child_image = $(this).children('img');
        if (child_image.css('filter') === 'grayscale(0)') {
            $(this).click();
        }
    });

    $('.advanced-search-top-objects > div').each(function () {
        const child_image = $(this).children('i').first();
        if (child_image.css('opacity') == '1') {
            $(this).click();
        }
    });

    $('.advanced-search-genre-image > div').each(function () {
        const child_image = $(this).children('img');
        if (child_image.css('opacity') == '1') {
            $(this).click();
        }
    });

    $('#advanced-search-text').val('');
    $('#advanced-search-series').val('');
}

$('#video-search-header-buttons > a').on('click', function (e) {
    removeFaceFilteredItem();
    getGroups(search_input[0].value);
});

function closeSearchForm() {
    constSearchForm.removeClass("active")
}

function getGroups(query = '', groups = ['collection'], retry = false, fq = []) {
    rows.empty();
    loader.css('display', 'block');

    if (!retry) {
        let modify_content = false;
        search(query, groups, ['rating', 'series_cover_photo', 'file'], fq).done(function (data) {
            if (data.grouped && data.grouped.collection && 'groups' in data.grouped.collection) {
                data.grouped.collection.groups.forEach(function (group) {
                    if (!group.groupValue)
                        return;

                    modify_content = true;
                    const doc = group.doclist.docs[0];
                    const file_id = doc.file.split('.')[0].split('streaming/')[1];
                    const thumbnail = ISEEQ_URL + 'api/file/' + file_id + '/thumbnail';
                    const html = `<div class="col-12 col-md-6 col-lg-4 col-xl-3"><div class="item-listing-container-skrn">
                    <a href="#" onclick="getSeriesEpisodes('${group.groupValue}', '${query}')"><img style="object-fit: cover;height: 337px;width: 100%" src="${getCurrentSchemaURL(thumbnail)}" alt="Listing"/></a>
                    <div class="item-listing-text-skrn"><div class="item-listing-text-skrn-vertical-align" style="width: 100%;">
                    <h6 style="direction: rtl; float: right;"><a href="#" onclick="getSeriesEpisodes('${group.groupValue}', '${query}')">${group.groupValue}</a></h6>
                    </div></div></div></div>`;
                    rows.append(html);
                });
            }
        }).fail(function (xhr, status, error) {
            console.log("Error: ", xhr.responseText);
        }).always(function () {
            if (modify_content) {
                loader.css('display', 'none');
                closeSearchForm();
                resetStatusBar();
            } else {
                getGroups(query, groups, true, fq);
            }
            $('.overlay').css({'height': document.body.scrollHeight});
        });
    } else {
        let new_query = query;
        if (query) {
            const split_query = new_query.trim().replace(/\s+/g, ' ').split(' ');

            new_query = '((first_name:(' + split_query[0];
            for (let i = 1; i < split_query.length; i++) {
                new_query += ' OR ' + split_query[i];
            }
            new_query += ')) OR (last_name:(' + split_query[0];
            for (let i = 1; i < split_query.length; i++) {
                new_query += ' OR ' + split_query[i];
            }
            new_query += ')) OR (exact_text:(' + split_query[0];
            for (let i = 1; i < split_query.length; i++) {
                new_query += ' OR ' + split_query[i];
            }
            // new_query += ')) OR (name_en:(' + split_query[0];
            // for (let i = 1; i < split_query.length; i++) {
            //     new_query += ' OR ' + split_query[i];
            // }
            new_query += ')) OR (name:(' + split_query[0];
            for (let i = 1; i < split_query.length; i++) {
                new_query += ' OR ' + split_query[i];
            }
            // new_query += ')) OR (name_en_AR:(' + split_query[0];
            // for (let i = 1; i < split_query.length; i++) {
            //     new_query += ' OR ' + split_query[i];
            // }
            // new_query += ')) OR (text_en:(' + split_query[0];
            // for (let i = 1; i < split_query.length; i++) {
            //     new_query += ' OR ' + split_query[i];
            // }
            new_query += ')) OR (text:(' + split_query[0];
            for (let i = 1; i < split_query.length; i++) {
                new_query += ' OR ' + split_query[i];
            }
            new_query += ')) OR (exact_text:(' + split_query[0];
            for (let i = 1; i < split_query.length; i++) {
                new_query += ' OR ' + split_query[i];
            }
            new_query += ')))';
        }

        search(new_query, groups, ['rating', 'series_cover_photo', 'file'], fq).done(function (data) {
            data.grouped.collection.groups.forEach(function (group) {
                if (!group.groupValue)
                    return;

                const doc = group.doclist.docs[0];
                const file_id = doc.file.split('.')[0].split('streaming/')[1];
                const thumbnail = ISEEQ_URL + 'api/file/' + file_id + '/thumbnail';
                const html = `<div class="col-12 col-md-6 col-lg-4 col-xl-3"><div class="item-listing-container-skrn">
                    <a href="#" onclick="getSeriesEpisodes('${group.groupValue}', '${query}', true)"><img style="object-fit: cover;height: 337px;width:100%" src="${getCurrentSchemaURL(thumbnail)}" alt="Listing"></a>
                    <div class="item-listing-text-skrn"><div class="item-listing-text-skrn-vertical-align">
                    <h6 style="direction: rtl; float: right;"><a href="#" onclick="getSeriesEpisodes('${group.groupValue}', '${query}', true)">${group.groupValue}</a></h6>
                    </div></div></div></div>`;
                rows.append(html);
            });
        }).always(function () {
            loader.css('display', 'none');
            closeSearchForm();
            resetStatusBar();
        });
    }
}

function getSeriesEpisodes(collection, query = '', expand_query = false) {
    rows.empty();
    loader.css('display', 'block');

    let new_query = query;
    if (new_query && expand_query) {
        const split_query = new_query.trim().replace(/\s+/g, ' ').split(' ');

        new_query = '((first_name:(' + split_query[0];
        for (let i = 1; i < split_query.length; i++) {
            new_query += ' OR ' + split_query[i];
        }
        new_query += ')) OR (last_name:(' + split_query[0];
        for (let i = 1; i < split_query.length; i++) {
            new_query += ' OR ' + split_query[i];
        }
        new_query += ')) OR (exact_text:(' + split_query[0];
        for (let i = 1; i < split_query.length; i++) {
            new_query += ' OR ' + split_query[i];
        }
        // new_query += ')) OR (name_en:(' + split_query[0];
        // for (let i = 1; i < split_query.length; i++) {
        //     new_query += ' OR ' + split_query[i];
        // }
        new_query += ')) OR (name:(' + split_query[0];
        for (let i = 1; i < split_query.length; i++) {
            new_query += ' OR ' + split_query[i];
        }
        // new_query += ')) OR (name_en_AR:(' + split_query[0];
        // for (let i = 1; i < split_query.length; i++) {
        //     new_query += ' OR ' + split_query[i];
        // }
        // new_query += ')) OR (text_en:(' + split_query[0];
        // for (let i = 1; i < split_query.length; i++) {
        //     new_query += ' OR ' + split_query[i];
        // }
        new_query += ')) OR (exact_text:(' + split_query[0];
        for (let i = 1; i < split_query.length; i++) {
            new_query += ' OR ' + split_query[i];
        }
        new_query += ')))';
    }

    search((new_query? new_query  + ' AND ': '' ) + 'collection:"' + collection + '"', ['file_id'],
        ['collection', 'file', 'file_id', 'rating', 'series_cover_photo']).done(function (data) {
        data.grouped.file_id.groups.forEach(function (file_id) {
            if (!file_id.groupValue)
                return;
            const doc = file_id.doclist.docs[0];
            let file = ISEEQ_URL + doc.file;
            const video_id = doc.file.split('.')[0].split('streaming/')[1];
            const thumbnail = ISEEQ_URL + 'api/file/' + video_id + '/thumbnail';
            const html = `<div class="col-12 col-md-6 col-lg-4 col-xl-3"><div class="item-listing-container-skrn">
                <a href="#" onclick="getRecords(\`${doc.collection}\`,\`${doc.file_id.replace(/"/g, '\\x22').replace(/'/g, '\\x27')}\`, \`${file}\`, \`${query}\`, ${expand_query})">
                <img style="object-fit: cover;height: 337px;width: 100%" src="${getCurrentSchemaURL(thumbnail)}" alt="Listing"></a>
                <div class="item-listing-text-skrn"><div class="item-listing-text-skrn-vertical-align">
                <h6><a href="${file}">${file_id.groupValue} </a></h6></div></div></div></div>`;
            rows.append(html);
        });

    }).always(function () {
        loader.css('display', 'none');
        closeSearchForm();
        $('.breadcrumb').html(
            ` <li class="breadcrumb-item">
                <a onclick="getGroups('${query}', ['collection'], ${expand_query});" 
                href="javascript:void(0)"><i class="fas fa-home"></i></a>&nbsp;
                <i class="fas fa-angle-right mr-2" style="color:gray;"></i></li>
             <li class="breadcrumb-item" aria-current="page"><span><u>${collection}</u></span></li>`);
    });
}

function getRecords(collection, file_id, streaming_url, query = '', get_series_query_expanded) {
    rows.empty();
    loader.css('display', 'block');
    $('.breadcrumb').html(
        ` <li class="breadcrumb-item"><a onclick="getGroups('${query}', ['collection'], '${get_series_query_expanded}');" 
            href="javascript:void(0)"><i class="fas fa-home"></i></a>&nbsp;
            <i class="fas fa-angle-right mr-2" style="color:gray;"></i></li>
             <li class="breadcrumb-item"><a onclick="getSeriesEpisodes('${collection}', '${query}', ${get_series_query_expanded})" 
             href="javascript:void(0)" class="mr-2"><span><u>${collection}</u></span></a><i class="fas fa-angle-right mr-2" style="color:gray;"></i></li>
             <li class="breadcrumb-item" aria-current="page"><span>${file_id}</span></li>`
    );

    const video_player_html = `<div style="width: 97%; margin: 0 auto;">
        <div id="browser-sidebar">
            <ul class="nav nav-tabs" id="mediaTypes" role="tablist">
              <li class="nav-item">
                <a class="nav-link active" id="faces-tab" data-toggle="tab" data-target="#faces" href="#" role="tab" aria-controls="faces" aria-selected="true">Faces
            ${(query ? '<i id="face_show_all" class="fas fa-plus fa-xs pl-2"></i>' : '')}
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" id="speech-tab" data-toggle="tab" data-target="#speech" href="#" role="tab" aria-controls="speech" aria-selected="false">Speech
            ${(query ? '<i id="speech_show_all" class="fas fa-plus fa-xs pl-2"></i>' : '')}
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" id="objects-tab" data-toggle="tab" data-target="#objects" href="#" role="tab" aria-controls="objects" aria-selected="false">Objects
            ${(query ? '<i id="object_show_all" class="fas fa-plus fa-xs pl-2"></i>' : '')}
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" id="text-tab" data-toggle="tab" data-target="#text" href="#" role="tab" aria-controls="text" aria-selected="false">Text
            ${(query ? '<i id="text_show_all" class="fas fa-plus fa-xs pl-2"></i>' : '')}
                </a>
              </li>
               <li class="nav-item">
                <a class="nav-link" id="plate-tab" data-toggle="tab" data-target="#plate" href="#" role="tab" aria-controls="text" aria-selected="false">Plates
            ${(query ? '<i id="text_show_all" class="fas fa-plus fa-xs pl-2"></i>' : '')}
                </a>
              </li>
            </ul>
            <div class="tab-content" id="myTabContent">
              <div class="tab-pane fade show active" id="faces" role="tabpanel" aria-labelledby="faces-tab"></div>
              <div class="tab-pane fade" id="speech" role="tabpanel" aria-labelledby="speech-tab"></div>
              <div class="tab-pane fade" id="objects" role="tabpanel" aria-labelledby="objects-tab"></div>
              <div class="tab-pane fade" id="text" role="tabpanel" aria-labelledby="text-tab"></div>
              <div class="tab-pane fade" id="plate" role="tabpanel" aria-labelledby="plate-tab"></div>
            </div>
        </div>
        <main id="browser-video-wrapper">
                 <div id="canvas-container-show-episode">
                     <div class="video-loader" style="width: 100%;">
                        <div class="ajax-loader" id="video-ajax-loader"></div>
                     </div>
                     <video id="video-show-episode" controls poster="" crossorigin="anonymous">
                         <source src="${getCurrentSchemaURL(streaming_url)}">
                         <track src="${ISEEQ_URL}api/file/${file_id}/transcription.srt" kind="subtitle" srclang="en-US" label="English"/>
                     </video>
                     <canvas id="canvas-video-cover-show-episode"></canvas>
                 </div>
        </main></div>`;
    rows.html(video_player_html);

    srt_load();

    const video = $('#video-show-episode')[0];
    video.ontimeupdate = function () {
        $(video).prev('.video-loader').css('display', 'none');
        if (video.paused && !canvas_already_drawn) {
            canvas_already_drawn = true;
        }
    };
    video.onplay = function () {
        setTimeout(function () {
            $('#canvas-video-cover-show-episode').hide();
        }, 2000);
    };

    function getFaceHtml(groups) {
        let html = '<ul id="accordion_face" class="list-group">';
        for (const group of groups) {
            let full_name_id;
            let url = '/images/avatar.png';
            if (!group['groupValue']) {
                full_name_id = 'unknown';
            } else {
                url = (group.doclist.docs[0]['face_photo_url'].charAt(0) == '/') ? FACE_URL + group.doclist.docs[0]['face_photo_url'].slice(1) : FACE_URL + group.doclist.docs[0]['face_photo_url'];
                full_name_id = 'face_' + group['groupValue'].replace(' ', '_');
            }

            html += '<li class="list-group-item py-2 hide-top-border">';
            html += '<div id="heading_' + full_name_id + '" data-toggle="collapse" style="cursor: pointer;" ' +
                'data-target="#' + full_name_id + '" aria-expanded="true" aria-controls="' + full_name_id + '" ' +
                'class="w-100 d-inline-block">';
            html += '<img src="' + (url) +
                '" class="img-thumbnail" style="float:left; width: 5em; height: 5em; object-fit: cover; margin-right: 0.5em">';
            html += '<p style="text-align: center;width:100%;margin-top: 20px">' + (group['groupValue'] ? group['groupValue'] : full_name_id) + '<span style="float: right;color:#3db13d;"><i class="fas fa-plus"></i> </span></p>';
            html += '</div>'; // card-header

            html += '<div id="' + full_name_id + '" class="collapse" aria-labelledby="heading_' +
                full_name_id + '" data-parent="#accordion_face" style="clear: both;">';

            html += '<div class="card-body">';
            html += '<ul class="list-group occurrence_list">';

            bubbleSort(group.doclist.docs, 'occurrence_time');

            for (let i = 0; i < group.doclist.docs.length; i++) {
                let doc = group.doclist.docs[i];
                let first_occurrence = parseInt(doc['occurrence_time']);

                let duration;
                let checkpoint = i;
                let j = 1;
                do {
                    if (!((checkpoint + j) in group.doclist.docs))
                        break;

                    duration = Math.abs(parseInt(group.doclist.docs[checkpoint + j]['occurrence_time']) -
                        first_occurrence);

                    if (duration < 10)
                        i++;
                    j++;
                } while (duration < 10);

                html += `<li id="${full_name_id}_${i}" class="list-group-item py-2 timestamp" 
                             onclick="currentItemMediaType='face';seekVideoTo(${doc['occurrence_time']});
                            currentItem=this;canvas_already_drawn = false;$('li.timestamp').removeClass('green-background');$(this).addClass('green-background'); current_highlighted_timestamp=$(this).attr('id');resize_canvas_and_draw_red_box(this);" style="cursor: pointer;">
                            <i class="fas fa-eye mr-1"></i>
                        ${secondsToClock(parseInt(doc['occurrence_time']))}
                        <code>${doc['emotion'] in emotion ? emotion[doc['emotion']] : ''}</code>`;
                if (full_name_id === 'unknown') {
                    html += `<i class="fa fa-edit" aria-hidden="true" onclick="showEnrollModal(\`${doc['file_id']}\`,${doc['occurrence_time']},'${doc['location']}',this);"
                    style="float: right; color: green; vertical-align: center; padding-top:0.4em; cursor: pointer;
                    z-index: 2; display: block;"></i>`
                }
                html += `<span style="display: none">${doc['location']}</span></li>`
            }

            html += '</ul></div></div></li>';
        }

        html += '</ul>';
        return html;
    }

    function getObjectHtml(groups) {
        let html = '<ul id="accordion_object" class="list-group">';
        for (const group of groups) {
            if (!group['groupValue'])
                continue;
            const name_id = 'object_' + group['groupValue'].replace(' ', '_');

            html += '<li class="list-group-item py-2 hide-top-border">';
            html += '<div id="heading_' + name_id + '" data-toggle="collapse" ' + ' style="cursor: pointer;" ' +
                'data-target="#' + name_id + '" aria-expanded="true" aria-controls="' + name_id + '" ' +
                'class="w-100 d-inline-block">';
            html += '<span style="float: left;">' + group['groupValue'] + '</span>';
            html += '</div>'; // card-header

            html += '<div id="' + name_id + '" class="collapse" aria-labelledby="heading_' +
                name_id + '" data-parent="#accordion_object" style="clear: both;">';
            html += '<div class="card-body">';

            html += `<ul id="${'list_' + name_id}" class="list-group occurrence_list">`;

            bubbleSort(group.doclist.docs, 'occurrence_time');

            for (let i = 0; i < group.doclist.docs.length; i++) {
                let doc = group.doclist.docs[i];
                let first_occurrence = parseInt(doc['occurrence_time']);

                let duration;
                let checkpoint = i;
                let j = 1;
                do {
                    if (!((checkpoint + j) in group.doclist.docs))
                        break;

                    duration = Math.abs(parseInt(group.doclist.docs[checkpoint + j]['occurrence_time']) -
                        first_occurrence);

                    if (duration < 10)
                        i++;
                    j++;
                } while (duration < 10);

                html += `<li id="list_${name_id}_${i}" class="list-group-item py-2 timestamp" onclick="currentItemMediaType='object';
                    seekVideoTo(${doc['occurrence_time']});
                    currentItem=this;canvas_already_drawn = false;$('li.timestamp').removeClass('green-background');$(this).addClass('green-background'); current_highlighted_timestamp=$(this).attr('id');resize_canvas_and_draw_red_box(this);"
                    style="cursor: pointer;"> 
                        <i class="fas fa-eye mr-1"></i>
                        ${secondsToClock(parseInt(doc['occurrence_time']))}
                    <i class="fa fa-trash" aria-hidden="true" onclick="deleteDocument('${doc['cs_uid']}', this, 
                        '${collection}', '${file_id}' , '${group['groupValue']}');"
                       style="float: right; color: red; vertical-align: center; padding-top:0.4em; cursor: pointer;
                              z-index: 2; display: block;"></i>
                    <span style="display: none"> ${doc['location']} </span></li>`;
            }

            html += '</ul></div></div></li>';
        }

        html += '</ul>';
        return html;
    }

    function getSpeechHtml(groups) {
        let html = '<ul id="accordion_speech" class="list-group">';
        for (const group of groups) {
            let text_id;
            if (group['groupValue'] === null) {
                text_id = 'stop_words';
                group['groupValue'] = '&lt;كلمات وقف&gt;';
            } else {
                text_id = 'speech_' + group.doclist.docs[0].exact_text.replace(' ', '_');
            }

            html += '<li class="list-group-item py-2 hide-top-border">';
            html += '<div id="heading_' + text_id + '" data-toggle="collapse" ' + ' style="cursor: pointer;" ' +
                'data-target="#' + text_id + '" aria-expanded="true" aria-controls="' + text_id + '" ' +
                'class="w-100 d-inline-block">';
            html += '<span style="float: left;">' + group.doclist.docs[0].exact_text + '</span>';
            html += '</div>'; // card-header

            html += '<div id="' + text_id + '" class="collapse" aria-labelledby="heading_' +
                text_id + '" data-parent="#accordion_speech" style="clear: both;">';
            html += '<div class="card-body">';

            html += '<ul class="list-group occurrence_list">';
            for (const doc of group.doclist.docs) {
                html += `<li id="list_${text_id}_${doc['occurrence_time']}" class="list-group-item py-2 timestamp" onclick="currentItemMediaType='object';
                               resetCanvas();seekVideoTo('${doc['occurrence_time']}');
                               $('li.timestamp').removeClass('green-background'); $(this).addClass('green-background');current_highlighted_timestamp=$(this).attr('id');" 
                             style="cursor: pointer;">
                    <i class="fas fa-eye mr-1"></i>
                    ${secondsToClock(parseInt(doc['occurrence_time']))} 
                    <span style="display: none">
                    ${doc['location']}
                    </span></li>`;
            }
            html += '</ul></div></div></li>';
        }

        html += '</ul>';
        return html;
    }

    function getOCRHtml(groups) {
        let html = '<ul id="accordion_text" class="list-group">';
        for (const group of groups) {
            if (!group['groupValue'])
                continue;
            const name_id = 'text_' + group['groupValue'].replace(' ', '_').replace(/(?:\r\n|\r|\n)/g, '');

            html += '<li class="list-group-item py-2 hide-top-border">';
            html += '<div id="heading_' + name_id + '" data-toggle="collapse" ' + ' style="cursor: pointer;" ' +
                'data-target="#' + name_id + '" aria-expanded="true" aria-controls="' + name_id + '" ' +
                'class="w-100 d-inline-block">';
            html += '<span style="float: left;">' + group['groupValue'].split('_').join(' ') + '</span>';
            html += '</div>'; // card-header

            html += '<div id="' + name_id + '" class="collapse" aria-labelledby="heading_' +
                name_id + '" data-parent="#accordion_text" style="clear: both;">';
            html += '<div class="card-body">';

            html += `<ul id="${'list_' + name_id}" class="list-group occurrence_list">`;

            bubbleSort(group.doclist.docs, 'occurrence_time');

            for (let i = 0; i < group.doclist.docs.length; i++) {
                let doc = group.doclist.docs[i];
                let first_occurrence = parseInt(doc['occurrence_time']);

                let duration;
                let checkpoint = i;
                let j = 1;
                do {
                    if (!((checkpoint + j) in group.doclist.docs))
                        break;

                    duration = Math.abs(parseInt(group.doclist.docs[checkpoint + j]['occurrence_time']) -
                        first_occurrence);

                    if (duration < 10)
                        i++;
                    j++;
                } while (duration < 10);

                html += `<li id="list_${name_id}_${i}" class="list-group-item py-2 timestamp" onclick="currentItemMediaType='text';
                    seekVideoTo(${doc['occurrence_time']});
                    currentItem=this;canvas_already_drawn = false;
                    $('li.timestamp').removeClass('green-background');$(this).addClass('green-background');current_highlighted_timestamp=$(this).attr('id');"
                    style="cursor: pointer;"> 
                        <i class="fas fa-eye mr-1"></i>
                        ${secondsToClock(parseInt(doc['occurrence_time']))}
                    <i class="fa fa-trash" aria-hidden="true" onclick="deleteDocument('${doc['cs_uid'].split("\n").join("\\n")}', this, 
                        '${collection}', '${file_id}' , '${group['groupValue']}');"
                       style="float: right; color: red; vertical-align: center; padding-top:0.4em; cursor: pointer;
                              z-index: 2; display: block;"></i>
                    <span style="display: none"> ${doc['location']} </span></li>`;
            }

            html += '</ul></div></div></li>';
        }

        html += '</ul>';
        return html;
    }

    function getPlatesHtml(groups) {
        let html = '<ul id="accordion_plate" class="list-group">';
        for (const group of groups) {
            if (!group['groupValue'])
                continue;
            const name_id = 'text_' + group['groupValue'].replace(' ', '_');

            html += '<li class="list-group-item py-2 hide-top-border">';
            html += '<div id="heading_' + name_id + '" data-toggle="collapse" ' + ' style="cursor: pointer;" ' +
                'data-target="#' + name_id + '" aria-expanded="true" aria-controls="' + name_id + '" ' +
                'class="w-100 d-inline-block">';
            html += '<span style="float: left;">' + group['groupValue'].split('_').join(' ') + '</span>';
            html += '</div>'; // card-header

            html += '<div id="' + name_id + '" class="collapse" aria-labelledby="heading_' +
                name_id + '" data-parent="#accordion_plate" style="clear: both;">';
            html += '<div class="card-body">';

            html += `<ul id="${'list_' + name_id}" class="list-group occurrence_list">`;

            bubbleSort(group.doclist.docs, 'occurrence_time');

            for (let i = 0; i < group.doclist.docs.length; i++) {
                let doc = group.doclist.docs[i];
                let first_occurrence = parseInt(doc['occurrence_time']);

                let duration;
                let checkpoint = i;
                let j = 1;
                do {
                    if (!((checkpoint + j) in group.doclist.docs))
                        break;

                    duration = Math.abs(parseInt(group.doclist.docs[checkpoint + j]['occurrence_time']) -
                        first_occurrence);

                    if (duration < 10)
                        i++;
                    j++;
                } while (duration < 10);

                html += `<li id="list_${name_id}_${i}" class="list-group-item py-2 timestamp" onclick="currentItemMediaType='text';
                    seekVideoTo(${doc['occurrence_time']});
                    currentItem=this;canvas_already_drawn = false;
                    $('li.timestamp').removeClass('green-background');$(this).addClass('green-background');current_highlighted_timestamp=$(this).attr('id');"
                    style="cursor: pointer;"> 
                        <i class="fas fa-eye mr-1"></i>
                        ${secondsToClock(parseInt(doc['occurrence_time']))}
                    <i class="fa fa-trash" aria-hidden="true" onclick="deleteDocument('${doc['cs_uid'].split("\n").join("\\n")}', this, 
                        '${collection}', '${file_id}', '${group['groupValue']}');"
                       style="float: right; color: red; vertical-align: center; padding-top:0.4em; cursor: pointer;
                              z-index: 2; display: none;"></i>
                    <span style="display: none"> ${doc['location']} </span></li>`;
            }

            html += '</ul></div></div></li>';
        }

        html += '</ul>';
        return html;
    }

    const tabs = {
        'object': '#objects-tab',
        'face': '#faces-tab',
        'speech': '#speech-tab',
        'text': '#text-tab',
        'plate': '#plate-tab'
    };

    const getTabHtml = {
        'object': getObjectHtml,
        'face': getFaceHtml,
        'speech': getSpeechHtml,
        'text': getOCRHtml,
        'plate': getPlatesHtml
    };

    const query_loaded = {};

    const media_fields = {
        face: [
            'first_name',
            'last_name'
        ],
        object: [
            'name',
        ],
        speech: [
            'exact_text'
        ]
    };

    // Preload faces
    load_media_tab('face', 'full_name', query);

    $('.nav-link').click(function (e) {
        if (e.target.attributes['aria-controls'].nodeValue === 'speech') {
            $('#canvas-video-cover-show-episode').hide();
        } else {
            $('#canvas-video-cover-show-episode').show();
        }
    });

    $(tabs['object']).click(function () {
        load_media_tab('object', 'name', query);
    });

    $(tabs['speech']).click(function () {
        load_media_tab('speech', 'exact_text', query);
    });

    $(tabs['text']).click(function () {
        load_media_tab('text', 'ocr', query);
    });

    $(tabs['plate']).click(function () {
        load_media_tab('plate', 'plate_number', query);
    });

    $(tabs['face']).click(function () {
        load_media_tab('face', 'full_name', query);
    });

    $('#object_show_all').click(function (event) {
        event.stopPropagation();
        load_expanded_media_tab('object', 'name', this);
    });

    $('#speech_show_all').click(function (event) {
        event.stopPropagation();
        load_expanded_media_tab('speech', 'exact_text', this);
    });

    $('#face_show_all').click(function (event) {
        event.stopPropagation();
        load_expanded_media_tab('face', 'full_name', this);
    });

    function load_expanded_media_tab(media_type, group_field, expand_button) {
        if ($(expand_button).hasClass('fa-plus')) {

            if (query_loaded['query_all'] &&
                query_loaded['query_all'][media_type]) {
                $(tabs[media_type].replace('-tab', ''))
                    .html(query_loaded['query_all'][media_type]);

                $(expand_button).removeClass('fa-plus');
                $(expand_button).addClass('fa-minus');
                return;
            }

            $(tabs[media_type].replace('-tab', '')).html('<div class="ajax-loader"></div>');
            search('', [group_field], ['occurrence_time', 'location', 'face_photo_url', 'exact_text', 'cs_uid', 'emotion'],
                ['media_type:' + media_type, 'collection:"' + collection + '"', 'file_id:"' + file_id + '"'], 20).done(function (data) {
                if (data.grouped[group_field].groups.length === 0) {
                    $(tabs[media_type].replace('-tab', '')).html('<p class="m-1">No records found.</p>');
                } else {
                    const html = getTabHtml[media_type](data.grouped[group_field].groups, false);

                    // Set opacity of expanded faces
                    let old_ids = [];

                    $($.parseHTML(query_loaded[query][media_type])).find('.d-inline-block').each(function () {
                        old_ids.push(this.id);
                    });

                    $(tabs[media_type].replace('-tab', '')).html(html);

                    $(tabs[media_type].replace('-tab', '')).find('.d-inline-block').each(function () {
                        if (!old_ids.includes(this.id)) {
                            $(this).css('opacity', '0.5');
                        }
                    });

                    if (!query_loaded['query_all'])
                        query_loaded['query_all'] = {};

                    query_loaded['query_all'][media_type] =
                        $(tabs[media_type].replace('-tab', '')).html();
                }
            }).fail(function () {
                $(tabs[media_type].replace('-tab', '')).html('<p class="m-1">Failed to get records.</p>');
            });

            $(expand_button).removeClass('fa-plus');
            $(expand_button).addClass('fa-minus');
        } else {
            load_media_tab(media_type, group_field, query);

            $(expand_button).removeClass('fa-minus');
            $(expand_button).addClass('fa-plus');
        }
    }

    function load_media_tab(media_type, group_field, query) {
        if ($(tabs[media_type] + ' i').length !== 0) {
            $(tabs[media_type] + ' i').removeClass('fa-minus');
            $(tabs[media_type] + ' i').addClass('fa-plus');
        }

        Object.keys(tabs).forEach(function (key) {
            if (key !== media_type) {
                $('#' + key + '_show_all').hide();
            } else {
                $('#' + media_type + '_show_all').show();
            }
        });

        if (query_loaded[query] && query_loaded[query][media_type]) {
            $(tabs[media_type].replace('-tab', '')).html(query_loaded[query][media_type]);
            $("#" + current_highlighted_timestamp).addClass('green-background');
            return;
        }

        $(tabs[media_type].replace('-tab', '')).html('<div class="ajax-loader"></div>');

        const split_query = query.trim().replace(/\s+/g, ' ').split(' ');
        let new_query = '(';
        for (const i in media_fields[media_type]) {
            new_query += ' OR (' + media_fields[media_type][i] + ':(' + split_query[0];
            for (let j = 1; j < split_query.length; j++) {
                new_query += ' OR ' + split_query[j];
            }
            new_query += '))';
        }
        new_query += ')';
        // Replace first occurrence only
        new_query = new_query.replace(' OR ', '');

        if (new_query === '()')
            new_query = '*:*';


        search((query ? new_query : ''), [group_field],
            ['file_id', 'occurrence_time', 'location', 'face_photo_url', 'exact_text', 'cs_uid', 'plate_number', 'emotion'],
            ['media_type:' + media_type, 'collection:"' + collection + '"', 'file_id:"' + file_id + '"'], 20
        ).done(function (data) {

            if (data.grouped[group_field].groups.length === 0) {
                $(tabs[media_type].replace('-tab', '')).html('<p class="m-1">No records found.</p>');
                if (!query_loaded[query])
                    query_loaded[query] = {};

                query_loaded[query][media_type] = ''
            } else {
                const html = getTabHtml[media_type](data.grouped[group_field].groups);
                $(tabs[media_type].replace('-tab', '')).html(html);

                if (!query_loaded[query])
                    query_loaded[query] = {};

                query_loaded[query][media_type] = html;
            }

            $("#" + current_highlighted_timestamp).addClass('green-background');
        }).always(function () {
            loader.css('display', 'none');
        });
    }
}

function removeFaceFilteredItem() {
    $('.face-filtered-item').remove();
    current_top_search_face = null;
}

function removeGenreFilteredItem() {
    current_top_search_genre = null;
    $(".genre-filtered-item").remove();
    getGroups(current_top_search_face ? current_top_search_face : '');
}

function addGenreFilteredItem(genre, props) {
    getGroups(current_top_search_face ? current_top_search_face : '', ['collection'], false, ["genre:" + genre]);
    const html = `<img class="genre-filtered-item" onclick="removeGenreFilteredItem();closeSearchForm();" style="width: 50px;height: 50px;padding:5px" class="video-search-filtered-item" src='${props}'/>`;

    $(".genre-filtered-item").remove();
    $('#video-search-header').append(html);
}

function loadFacesForAdvancedSearch() {
    getTopFaces().then(faces => {
        if (faces.length) {
            let row = '';
            for (let index = 0; index < 4 && index < faces.length; index++) {
                let name = faces[index]['value'];
                let face_id = faces[index]['pivot'][0]['value'];
                let img = faces[index]['pivot'][0]['pivot'][0]['value'];
                const url = (img.charAt(0) == '/') ? FACE_URL + img.slice(1) : FACE_URL + img;
                let rowItem = ` <span style="display: inline-block;">
                           <div id="advanced-search-face-id-${face_id}" style="position: relative;margin-left: 20px"
                                onclick="_children=$(this).children();
                                         _children.eq(1).toggleClass('not-checked');
                                         toggleFromFacesArray(_children.first(), $(this).next().html().trim())">
                             <img class="advanced-search-image-icon rounded-img" src="${url}">
                              <i class="fas fa-check-square not-checked fa-lg" style="position: absolute; top:18px; right:0;"></i>
                           </div>
                             <div style="font-family: cairo-regular; font-size: 0.9em;margin: 0 auto; text-align: center;max-width: 100px">
                                ${name}
                             </div>
                        </span>`;

                row += rowItem;
            }

            $(row).insertBefore('#advanced-search-add-face');
            $('#advanced-search-add-face')[0].parentNode.scrollLeft = $('#advanced-search-add-face')[0].offsetLeft;
        }
    })
}

function toggleFromFacesArray(element, face_name) {
    if (faces.indexOf(face_name) > -1) {
        faces.splice([faces.indexOf(face_name)], 1);
        element.css('-webkit-filter', 'grayscale(100%)');
        element.css('filter', 'grayscale(100%)');
    } else {
        faces.push(face_name);
        element.css('-webkit-filter', 'grayscale(0%)');
        element.css('filter', 'grayscale(0%)');
    }
}

function deleteDocument(cs_uid, trash_element, collection, file_id, object_name) {
    const parent = $(trash_element).closest('li');
    parent.css('opacity', '0.5');

    const next_li_element = parent.next();

    const next_location_element = $(trash_element).next();
    $(trash_element).detach();

    $('<div style="position: relative; float: right;"><img src="images/ajax-loader.gif" ' +
        'style="width: 25px; height: 25px; position: absolute; right: 1em;"></div>').insertBefore(next_location_element);

    event.cancelBubble = true;
    event.stopPropagation();

    deleteOccurrence(cs_uid).done(function () {
        parent.fadeOut('normal', function () {
                if (next_li_element)
                    next_li_element.click();

                this.remove();

                // Load new document
                const ul_element = $('#list_object_' + object_name.replace(' ', '_'));

                search('', [], ['occurrence_time', 'location', 'cs_uid'], ['media_type:object', 'collection:"' + collection + '"',
                    'file_id:"' + file_id + '", name:' + object_name], 1, ul_element.find('li').length, 1).done(function (result) {
                    doc = result.response.docs[0];
                    if (doc) {
                        ul_element.append(
                            `<li class="list-group-item py-2" onclick="seekVideoTo(${doc['occurrence_time']});
                                currentItem=this;canvas_already_drawn = false;"
                                style="cursor: pointer;"> ${secondsToClock(parseInt(doc['occurrence_time']))}
                                <i class="fa fa-trash" aria-hidden="true" onclick="deleteDocument('${doc['cs_uid']}', this, 
                                    '${collection}', '${file_id}' , '${object_name}', ${ul_element.find('li').length});"
                                   style="float: right; color: red; vertical-align: center; padding-top:0.4em; cursor: pointer;
                                          z-index: 2"></i>
                                <span style="display: none"> ${doc['location']} </span></li>`
                        );
                    }
                });

            }
        );
    }).fail(function () {
        parent.css('opacity', 1);
        next_location_element.prev('div').remove();
        $(trash_element).insertBefore(next_location_element);
    });
}

function removeFromRecentSearch(item) {
    recent_searches_local.splice(recent_searches_local.indexOf(item.trim()), 1);
    localStorage.setItem('recent_searches_local', JSON.stringify(recent_searches_local));

    $(`.ui-autocomplete .ui-menu-item#recent-search-${item.trim().replace(' ', '_')}`).remove();
}

function reprocess(file_id, time, event) {
    $(event).closest('li').append('<i class="fas fa-spinner fa-pulse" style="float:right;margin-right:5px"></i>');
    reProcessFace(file_id, time).done(result => {
        $(event).closest('li').remove();
    }).fail(error => {
        console.log(error);
        $(event).parent().find('.fa-spinner').remove();
    })
}

$(document).ready(function () {
    if (!inAdmin) {
        loadFacesForAdvancedSearch();

        $('#production-year-from').datepicker({
            format: "yyyy",
            viewMode: "years",
            minViewMode: "years",
            defaultDate: new Date(1959),
        });
        $('#production-year-to').datepicker({
            format: "yyyy",
            viewMode: "years",
            minViewMode: "years",
            startDate: new Date(95),
            defaultDate: new Date(2019),
        });

        search_input.autocomplete({
            source: function (request, response) {
                let results = $.ui.autocomplete.filter(recent_searches_local, request.term);

                const start_index = (results.length >= 3 ? results.length - 3 : 0);

                results = results.slice(start_index, results.length);
                autocomplete_delimeter_index = results.length;

                searchQueries(request.term.trim()).done(function (result) {
                    let count = 0;
                    for (const suggestion of result.response.docs) {
                        if (count === 3)
                            break;

                        results.push(suggestion['query']);
                        count++;
                    }

                    autocomplete_current_iteration = 0;
                    response(results);
                });

            },
        }).autocomplete("instance")._renderItem = function (ul, item) {
            if ('label' in item) {
                const result = $(`
            <li class="ui-menu-item" id="recent-search-${item.label.trim().replace(' ', '_')}">
            <div onclick="onSearchBoxEnter({'keyCode': 13}, '${item.label.trim()}');">
                <span style="padding-left: 1.5em;${autocomplete_current_iteration >= autocomplete_delimeter_index ? 'color: black;' : ''}">
                    ${item.label.trim()}
                </span>
                <span style="float: right; font-weight: normal; font-size: 90%; color: blue; cursor: pointer;
                             padding-right: 1.5em; ${autocomplete_current_iteration >= autocomplete_delimeter_index ? 'display: none;' : ''}" 
                             onclick="event.stopPropagation(); removeFromRecentSearch('${item.label.trim()}')">
                      Remove
                </span>
            </div>`).appendTo(ul);

                autocomplete_current_iteration++;
                return result;
            }

        };
    }
    $('#sidebar-nav').css('height', window.innerHeight);
});

function resetStatusBar() {
    $('.breadcrumb').html(`<li class="breadcrumb-item" aria-current="page"><i class="fas fa-home mr-2"></i>Videos</li>`);
}

function showEnrollModal(file_id, time, location, element) {
    let video = document.getElementById('video-show-episode');
    let base64 = capture(video, location);
    $('#enroll-loader').show();
    $('#enroll-suggestions').empty();
    $('#enroll-suggestions').hide();
    $('#enroll-firstName').val('');
    $('#enroll-lastName').val('');
    $('#enroll-file').val('');
    $('#enroll-suggestions').selectpicker('destroy');


    $("#enroll-image").attr('src', base64);
    $('#enrollment_modal').fadeIn('fast');
    $('.overlay').show();

    let faces = [];
    recognize_face(base64, 50, 10, location, 'politicians').done(data => {
        if (data.length) {
            data.forEach(element => {
                element['predictions'].forEach(face => {
                    let name = face['first_name'] + ' ' + face['last_name'];
                    if (!faces.includes(name)) {
                        faces.push(name);
                        const url = (face['photo'].charAt(0) == '/') ? FACE_URL + face['photo'].slice(1) : FACE_URL + face['photo'];
                        $('#enroll-suggestions').append(`<option ${faces.length === 1 ? 'selected' : ''} data-content="<div><img src='${url}' style='width: 50px; height: 50px;' class='rounded-circle' /><span style='margin-left: 20px;'>${face['first_name']} ${face['last_name']}</span></div>" value="${face['face_id']}">${face['first_name']} ${face['last_name']}</option>`);
                    }
                })
            });
            $('#enroll-suggestions').selectpicker({styleBase: 'btn p-1'});
        }
        $('#enroll-loader').hide();
        $('#enroll-suggestions').show();
    }).fail(error => {
        console.log(error);
    });

    $('#modal-enroll').off().on('click', function () {
        let firstName = $('#enroll-firstName').val();
        let lastName = $('#enroll-lastName').val();
        $('#enroll-submit-loader').show();
        let data = $("#enroll-image").attr('src');
        let buffer = new Uint8Array(_base64ToArrayBuffer(data));
        if (firstName != '' && lastName != '') {
            enroll_face(buffer, firstName, lastName).then(_ => {
                $('#enroll-submit-loader').hide();
                reprocess(file_id, time, element);
                $('#enrollment_modal').fadeOut('fast');
                $('.overlay').hide();
            }).catch(_ => {
                $('#enroll-submit-loader').hide();
            });
        } else {
            let face_id = $('#enroll-suggestions').val();
            if (face_id) {
                add_face(buffer, face_id).done(data => {
                    reprocess(file_id, time, element);
                    $('#enrollment_modal').fadeOut('fast');
                    $('.overlay').hide();
                }).always(_ => {
                    $('#enroll-submit-loader').hide();
                });
            } else {
                $('#enroll-submit-loader').hide();
            }
        }

    });
}


$(function () {
    if (!inAdmin) {
        getGroups();
        search_input.focus();
    }
});
