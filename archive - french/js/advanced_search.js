const faces = [];
let resolved_faces = [];
let resolved_objects = [];
const objects = [];
const calculated_height = window.innerHeight;
$('#advanced-video-search-header-filtering-padding').css('height', calculated_height);
$('#advanced-video-search-header-filtering-padding').css('min-height', calculated_height);

const genres = [];
const emotions = [];
const distance_label = $('#distance-seconds-label');

let distance = 23;
$('#advanced-search,#advanced-search-close-button').click(function () {
    const calculated_height = window.innerHeight;
    $('#advanced-video-search-header-filtering-padding').css('height', calculated_height);
    $('#advanced-video-search-header-filtering-padding').css('min-height', calculated_height);

    const $this = $("#video-search-header");
    if ($this.hasClass('advanced-active')) {
        $this.removeClass('advanced-active').addClass('advanced-hide');
    } else {
        $this.addClass('advanced-active');
    }
});


$('#advanced-search-add-face').click(function () {
    $('#advanced-search-file').click();
});


$('#advanced-search-file').change(function (e) {
    let files = document.getElementById('advanced-search-file');
    getBase64(files.files[0]).then(function (base64) {
        loader.css('display', 'block');
        recognize_face(base64).done(function (array_of_faces) {
            if (array_of_faces.length === 0) {
                alert('Could not locate any face.');

            } else {
                if (array_of_faces[0]['predictions'].length === 0) {
                    alert('No faces found.');
                } else {
                    let prediction = array_of_faces[0]['predictions'][0];
                    let found_face_name = prediction['first_name'] + ' ' + prediction['last_name'];
                    faces.push(found_face_name);
                    let html = `<span style="display: inline-block;">
                                    <div style="position: relative;"
                                         onclick="_children=$(this).children();
                                                  _children.eq(1).toggleClass('not-checked');
                                                  toggleFromFacesArray(_children.first(), $(this).next().html().trim())">
                                        <img class="advanced-search-image-icon rounded-img" 
                                             src="${FACE_URL}${prediction.photo.split('/').splice(1).join('/')}" style="-webkit-filter: grayscale(0%); filter: grayscale(0%);">
                                        <i class="fas fa-check-square fa-lg" style="position: absolute; top:18px; right:0;"></i>
                                    </div><div style="font-family: cairo-regular; font-size: 0.9em; text-align: center;">${found_face_name}</div>
                                </span>`;
                    $(html).insertBefore('#advanced-search-add-face');
                    const addFacesNode = $('#advanced-search-add-face')[0];
                    addFacesNode.parentNode.scrollLeft = addFacesNode.offsetLeft;
                }
            }

        }).fail(function () {
            alert('Error while searching for faces.');
        }).always(function () {
            loader.css('display', 'none');
            $('#advanced-search-file')[0].value = '';
        })
    });
});


$('#advanced-search-button').click(function () {
    const searchText = $('#advanced-search-text').val();
    let text = searchText ? searchText.split(' ') : [];
    text = text.filter(x => x !== '' && x !== ' ');
    advancedSearch(searchText, faces, text, objects);
});

function advancedSearch(original_sentence, faces, text, objects, dictionaryFaces = false) {
    resetStatusBar();

    if (!text.length && !faces.length && !objects.length) {
        if (dictionaryFaces)
            getGroups(original_sentence);
        else
            loader.hide();

        return;
    }

    loader.show();
    searchPivot(faces, text, objects, dictionaryFaces).done(data => {
        if (data['response']) {
            if ('faces' in data)
                resolved_faces = data['faces'].filter(x => Object.keys(x).length);

            if ('objects' in data)
                resolved_objects = data['objects'].filter(x => Object.keys(x).length);

            filterResults();

            const final_matches = data['response'];
            if (Object.keys(final_matches).length) {
                showAdvancedSearchResults(final_matches, dictionaryFaces);
                loader.hide();
            } else {
                if (dictionaryFaces)
                    getGroups(original_sentence);
                else
                    loader.hide();
            }
        } else {
            loader.hide();
        }
    }).fail(error => {
        console.log(error);
        $('#above-dot-row-wrapper+.row').html('');
        resetStatusBar();

        if (dictionaryFaces)
            getGroups(original_sentence);
        else
            loader.hide();
    });
}

function toggleObject(e, name) {
    if (objects.includes(name)) {
        objects.splice([objects.indexOf(name)], 1);
        e.style.opacity = '0.5';
    } else {
        objects.push(name);
        e.style.opacity = '1';
    }
}

function toggleGenre(e, name) {
    if (genres.includes(name)) {
        genres.splice([genres.indexOf(name)], 1);
        e.style.opacity = '0.5';
    } else {
        genres.push(name);
        e.style.opacity = '1';
    }
}

function toggleEmotions(e, name) {
    if (emotions.includes(name)) {
        emotions.splice([emotions.indexOf(name)], 1);
        e.style.opacity = '0.5';
    } else {
        emotions.push(name);
        e.style.opacity = '1';
    }
}

function setDistance(seconds) {
    distance = seconds;
    distance_label.text(seconds + (seconds == 1 ? ' second' : ' seconds'))
}

$('#advanced-search-series,#admin-video-series-input').on('input', function (e) {
    $('#series-titles').html('');

    if ($(this).val() !== '')
        suggestSeries($(this).val()).done(function (response) {
            const suggestions = [];
            const all_series = response['facet_counts']['facet_fields']['collection'];

            for (let i = 0; i < all_series.length - 1; i += 2) {
                if (all_series[i + 1] !== 0) {
                    suggestions.push(all_series[i]);
                }
            }

            let html = '';
            for (let suggestion of suggestions) {
                html += `<option>${suggestion}</option>`;
            }

            $('#series-titles').html(html);

        });
});
