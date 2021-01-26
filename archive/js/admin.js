let wrapper;
let add_button;


function analyze() {
    loader.css('display', 'block');
    let options = {
        'face': $('#admin-analysis-faces').is(":checked"),
        'speech': $('#admin-analysis-speech').is(":checked"),
        'object': $('#admin-analysis-objects').is(":checked"),
        'ocr': $('#admin-analysis-ocr').is(":checked"),
        'anpr': $('#admin-analysis-anpr').is(":checked"),
        'emotion': $('#admin-analysis-emotion').is(":checked"),
        'gender': $('#admin-analysis-gender').is(":checked"),
        'face_engine': $('#face_engines').val(),
        'speech_language': $('#speech_language').val(),
    };
    let collection = $('#admin-video-series-input').val();

    if (options['face_engine'] === 'default')
        delete options['face_engine'];

    if (collection !== '')
        options['collection'] = collection;

    $('.meta-fields').each((index, element) => {
        let key = $(element).find('input').eq(0).val();
        let value = $(element).find('input').eq(1).val();
        if (key && value)
            options[key] = value;
    });


    file2Binary($('#admin-file-dialog')[0].files[0]).then(binary => {
        let name = $('#admin-file-dialog')[0].files[0].name.split('.')[0];
        getVideoInfo(binary, name, options).done(doc => {
            if (options['speech']) {
                // check for offensive words
                const curseWords = ['fuck', 'bitch', 'shit', 'asshole', 'bastard', 'damn', 'dammit'];
                let foundWords = [];
                doc['transcriptions'].forEach(sen => {
                    sen[1].split(' ').forEach(word => {
                        if (curseWords.indexOf(word) > -1) {
                            foundWords.push(`${word.substring(0, 3) + '*'.repeat(word.length - 3)} (sec ${sen[0] + 1})`);
                        }
                    });
                });

                if (foundWords.length) {
                    Swal.fire({
                        title: 'Video contains curse words!',
                        text: foundWords.join(", "),
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#1dcca5',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Delete video'
                    }).then((result) => {
                        if (result.value) {
                            deleteVideo(doc['_id']).done(_ => {
                                Swal.fire(
                                    'Deleted!',
                                    'Video has been deleted',
                                    'success'
                                ).then(() => location.reload())
                            });
                        }
                    });
                }
            }
            $('#upload-wrapper').remove();
            getRecords(doc['info']['collection'], name, ISEEQ_URL + doc['streaming'], '', false);
        }).always(_ => loader.css('display', 'none'));
    }).catch(error => {
        loader.css('display', 'none');
        console.log(error);
    })
}

$(document).ready(function () {

    wrapper = $("#meta");
    add_button = $("#add_form_field");

    $('#sidebar-nav').css('height', window.innerHeight);
    $('#admin-file-dialog').on('change', function () {
        $('#admin-video').attr('src', URL.createObjectURL(this.files[0]));
    });

    $('#admin-analyze-video').click(function () {
        if ($('#admin-file-dialog')[0].files.length === 1)
            analyze();
    });

    $('#admin-analysis-speech').on('change', function () {
        if ($('#admin-analysis-speech').is(":checked"))
            $('#speech_language').closest('div.row').show();
        else
            $('#speech_language').closest('div.row').hide();
    });

    getFaceEngines().done(data => {
        data.forEach(option => {
            if (option) {
                $('#face_engines').append(`<option value="${option}">${option}</option>`);
            }
        });
    });

    $(add_button).click(function (e) {
        e.preventDefault();
        $(wrapper).append(` <div class="row meta-fields">
                                    <div class="col-4" style="padding: 0; padding-left: 13px;">
                                        <div><input style="width:100%;margin-left: 0;" class="admin-input"
                                                    placeholder="Property" type="text"></div>
                                    </div>
                                    <div class="col-5">
                                        <div><input style="width: 100%;margin-left: 0;" class="admin-input"
                                                    placeholder="Value" type="text"></div>
                                    </div>
                                    <div class="col-2" style="padding: 0;">
                                        <input type="button" value="delete"
                                               style="width: 80%;margin-left: 0;cursor: pointer;" class="admin-input delete">
                                    </div>
                                </div>`);
    });

    $(wrapper).on("click", ".delete", function (e) {
        e.preventDefault();
        $(this).closest('div.row').remove();
    })

    getCollections().then(function (collections) {
        const suggestions = [];
        for (let i = 0; i < collections.length - 1; i += 2) {
            if (collections[i + 1] !== 0) {
                suggestions.push(collections[i]);
            }
        }

        let html = '';
        for (let suggestion of suggestions) {
            html += `<option>${suggestion}</option>`;
        }

        $('#series-titles').html(html);

    });
});
