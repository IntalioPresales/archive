let current_advanced_search_result;

function showAdvancedSearchResults(advanced_search_result, show_entities) {
    current_advanced_search_result = advanced_search_result;

    let accordion_html = '';

    Object.keys(current_advanced_search_result).forEach(function (collection) {
        const series_id = collection.replace(/\s/g, '_');

        accordion_html += `<li class="list-group-item list-group py-2">
                     <div id="heading_${series_id}" data-toggle="collapse" style="cursor: pointer;" 
                          data-target="#${series_id}" aria-expanded="true" aria-controls="${series_id}" 
                          class="w-100 d-inline-block" 
                          onclick="toggleArrow($(this).children().first());
                                   $(this).parent().nextAll().find('.collapse').removeClass('show');
                                   $(this).parent().nextAll().find('.fa-angle-down').addClass('fa-angle-right').removeClass('fa-angle-down');
                                   $(this).parent().prevAll().find('.collapse').removeClass('show');
                                   $(this).parent().prevAll().find('.fa-angle-down').addClass('fa-angle-right').removeClass('fa-angle-down');">
                          <i class="fas fa-angle-right mr-1 li-fa-outer"></i>
                          <span>${collection}</span>
                     </div>
                          
                     <div id="${series_id}" class="collapse" aria-labelledby="heading_${series_id}" 
                          data-parent="#accordion-advanced-search" style="clear: both;">
                          <div class="card-body">
                               <ul id="list-group-${series_id}" class="list-group occurrence_list">`;

        Object.keys(current_advanced_search_result[collection]).forEach(function (file_id) {
            accordion_html += `
                    <li class="list-group-item list-group py-2">
                        <div id="heading_${series_id}_${file_id}" 
                              style="cursor: pointer; display: block; width: 100%;" data-toggle="collapse" 
                              data-target="#${series_id}_${file_id}" aria-expanded="true" 
                              aria-controls="${series_id}_${file_id}"
                              onclick="$('#advanced-search-video').attr('src', 
                                                     getCurrentSchemaURL(ISEEQ_URL + current_advanced_search_result['${collection}']['${file_id.replace(/'/g, "\\'").replace(/"/g, '\\"')}']['url']));
                                                        $('#advanced-search-video')[0].load();toggleArrow($(this).children().first());
                                                        $('li.timestamp').removeClass('green-background')">
                                                     <i class="fas fa-angle-right mr-1 li-fa-inner"></i>
                                                     ${file_id}
                        </div>
                        
                        <div id="${series_id}_${file_id}" class="collapse" aria-labelledby="heading_${series_id}_${file_id}" 
                                   data-parent="#list-group-${series_id}" style="clear: both;">
                                   <div class="card-body">
                                        <ul class="list-group occurrence_list">`;

            const timestamps = optimizeArrayOfSeconds(current_advanced_search_result[collection][file_id]['timestamps'], 10);
            for (const timestamp of timestamps) {
                accordion_html += `
                                        <li onclick="seekVideoTo('${timestamp}', $('#advanced-search-video')[0]);
                                                     event.stopPropagation();
                                                     $('li.timestamp').removeClass('green-background');
                                                     $(this).addClass('green-background');"
                                            style="cursor: pointer;"
                                            class="list-group-item py-2 timestamp">
                                            <i class="fas fa-eye mr-1"></i>
                                            ${secondsToClock(timestamp)}
                                        </li>
                `;
            }

            accordion_html += `</ul></div></div></li>`;

        });

        accordion_html += `</ul></div></div></li>`;
    });

    const first_series = Object.keys(current_advanced_search_result)[0];
    const first_episode = Object.keys(current_advanced_search_result[first_series])[0];
    const file_id = current_advanced_search_result[first_series][first_episode]['url'].split('.')[0].split('streaming/')[1];

    let html = `
        <div id="advanced-search-result">
        <div style="clear: both;"></div>
            <div id="advanced-search-occurrences-sidebar">
                <ul id="accordion-advanced-search" class="list-group">
                    ${accordion_html}
                </ul>
            </div>
            <div id="advanced-search-result-video-wrapper">
                <div class="video-loader" style="width: 100%;">
                    <div class="ajax-loader" id="video-ajax-loader"></div>
                </div>
                <video id="advanced-search-video" controls
                       src="${getCurrentSchemaURL(ISEEQ_URL + current_advanced_search_result[first_series][first_episode]['url'])}"
                       ontimeupdate="removeAdvancedSearchVideoLoader(this);">
                <track src="${ISEEQ_URL}api/file/${file_id}/transcription.srt" kind="subtitle" srclang="en-US" label="English"/>       
                </video>
            </div>
        </div>
    `;

    rows.html(html);
    srt_load();
    $('#accordion-advanced-search > li:nth-child(1) > div.collapse').addClass('show');
    $('#accordion-advanced-search > li:nth-child(1) > div.collapse ul:nth-child(1) li:nth-child(1) > div.collapse').addClass('show');

    let first_arrow = $('#accordion-advanced-search > li:nth-child(1) > div > i.fa-angle-right');
    first_arrow = first_arrow.add('#accordion-advanced-search li:nth-child(1) ul:nth-child(1) li:nth-child(1) > div > i.fa-angle-right');
    first_arrow.removeClass('fa-angle-right');
    first_arrow.addClass('fa-angle-down');

    $('#above-dot-row-wrapper h4.heading-extra-margin-bottom').hide();
    $('.breadcrumb').html(`<li class="breadcrumb-item">
                <a onclick="getGroups('');" href="javascript:void(0)"><i class="fas fa-home"></i></a>&nbsp;
                <i class="fas fa-angle-right mr-2" style="color:gray;"></i></li><li class="breadcrumb-item" aria-current="page"><span>Search results</span></li>
                ${show_entities ? '<li id="advanced-search-filter-button" onclick="advancedSearchButton.click();"><i class="fa fa-sliders-h" onclick="$(this).prev().click();"></i></li>' : ''}`);

    $("#video-search-header").removeClass('advanced-active').addClass('advanced-hide');
    $('#advanced-search-video')[0].load();

    const rows_height = parseInt(window.innerHeight - $("#videohead-pro").innerHeight() -
        $("#above-dot-row-wrapper").outerHeight() - 65);

    $("#accordion-advanced-search").css({
        'height': rows_height,
        'max-height': rows_height,
        'min-height': rows_height
    });

    if (!show_entities) {
        search_input.val('');
        $('#video-search-header > code').remove();
        search_input.show();
    }

    current_highlighted_timestamp = null;
}

function toggleArrow(li_fa) {
    const current_class = li_fa.hasClass('fa-angle-right') ? 'fa-angle-right' : 'fa-angle-down';
    const target_class = current_class === 'fa-angle-right' ? 'fa-angle-down' : 'fa-angle-right';

    const li_fa_level = li_fa.hasClass('li-fa-outer') ? 'li-fa-outer' : 'li-fa-inner';
    $("." + li_fa_level).removeClass('fa-angle-down');
    $("." + li_fa_level).addClass('fa-angle-right');

    li_fa.removeClass(current_class);
    li_fa.addClass(target_class);
}

function removeAdvancedSearchVideoLoader(video) {
    $(video).prev('.video-loader').css('display', 'none');
}

function filterResults() {
    if (!(resolved_objects.length || resolved_faces.length))
        return;

    clearAdvancedSearch();

    // unselect faces
    $('#advanced-search-faces > span').each(function (e) {
        const element = $('#advanced-search-faces > span')[e];
        if (faces.includes($(element).find('div').text().trim()))
            element.children[0].click();
    });

    // clear text
    $('#advanced-search-text').val('');

    resolved_faces.forEach(function (face) {
        const f = $('#advanced-search-face-id-' + face['face_id']);
        if (f.length)
            f.click();
        else {
            const url = (face['face_photo_url'].charAt(0) == '/') ? FACE_URL + face['face_photo_url'].slice(1) : FACE_URL + face['face_photo_url'];
            const face_element = `<span style="display: inline-block;margin-left: 20px;">
                           <div id="advanced-search-face-id-${face['face_id']}" style="position: relative;"
                                onclick="_children=$(this).children();
                                         _children.eq(1).toggleClass('not-checked');
                                         toggleFromFacesArray(_children.first(), $(this).next().html().trim())">
                             <img class="advanced-search-image-icon rounded-img" src="${url}">
                              <i class="fas fa-check-square not-checked fa-lg" style="position: absolute; top:18px; right:0;"></i>
                           </div>
                             <div style="font-family: cairo-regular; font-size: 0.9em; text-align: center;max-width: 100px;">
                                ${face['full_name']}
                             </div>
                        </span>`;
            $('#advanced-search-faces').prepend(face_element);
            $('#advanced-search-face-id-' + face['face_id']).click();
        }
    });

    resolved_objects.forEach(function (object) {
        const f = $('#advanced-search-object-id-' + object);
        if (f.length)
            f.click();
    });
}
