const alert_box = $("#no-internet-alert");

$('#upload-image-button').click(function () {
    $('#upload-image-modal').modal('toggle');
    document.getElementById('selected-files').value = "";
    document.getElementById('choose-file-wrapper').innerHTML = "<strong>Choose an image</strong><span class=\"box__dragndrop\"> or drag it here</span>.";

});

function uploadImage() {
    search_input.val('');
    $('#video-search-header > code').remove();
    search_input.show();

    let files = document.getElementById('selected-files');
    getBase64(files.files[0]).then(function (base64) {
        loader.css('display', 'block');
        $('#upload-image-modal').modal('toggle');

        recognize_face(base64).done(function (array_of_faces) {
            if (array_of_faces.length !== 0) {
                if (array_of_faces[0]['predictions'].length !== 0) {
                    let prediction = array_of_faces[0]['predictions'][0];
                    let found_face_name = prediction['first_name'] + ' ' + prediction['last_name'];

                    $('#search-box').val(found_face_name);

                    getGroups(prediction['first_name'] + ' ' + prediction['last_name']);
                    removeFaceFilteredItem();

                } else {
                    $('#above-dot-row-wrapper+.row').html('');
                    resetStatusBar();
                }
            } else {
                $('#above-dot-row-wrapper+.row').html('');
                resetStatusBar();
            }

        }).fail(function () {
            alert_box.toggleClass('fade');
            setTimeout(function () {
                alert_box.toggleClass('fade');
            }, 4000);
        }).always(function () {
            loader.css('display', 'none');
        })
    });
}

// Drag & Drop
(function (document, window) {
    // feature detection for drag&drop upload
    var isAdvancedUpload = function () {
        var div = document.createElement('div');
        return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FileReader' in window;
    }();

    // applying the effect for every form
    var forms = document.querySelectorAll('.box');
    Array.prototype.forEach.call(forms, function (form) {
        var input = form.querySelector('input[type="file"]'),
            label = form.querySelector('label'),
            errorMsg = form.querySelector('.box__error span'),
            restart = form.querySelectorAll('.box__restart'),
            droppedFiles = false,
            showFiles = function (files) {
                label.textContent = files.length > 1 ? (input.getAttribute('data-multiple-caption') || '').replace('{count}', files.length) : files[0].name;
            },
            triggerFormSubmit = function () {
                uploadImage();
            };

        // automatically submit the form on file select

        $(input).on('change', function () {
            showFiles($('#selected-files')[0].files);
        });

        $('#image-drag-upload').click(function () {
            triggerFormSubmit();
        });

        $('.box').click(function (e) {
            $(input).trigger('click');
        });

        $("#choose-file-wrapper").click(function (e) {
            e.stopPropagation();
        });

        $(input).click(function (e) {
            e.stopPropagation();
        });

        // drag&drop files if the feature is available
        if (isAdvancedUpload) {
            form.classList.add('has-advanced-upload'); // letting the CSS part to know drag&drop is supported by the browser

            ['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'].forEach(function (event) {
                form.addEventListener(event, function (e) {
                    // preventing the unwanted behaviours
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            ['dragover', 'dragenter'].forEach(function (event) {
                form.addEventListener(event, function () {
                    form.classList.add('is-dragover');
                });
            });
            ['dragleave', 'dragend', 'drop'].forEach(function (event) {
                form.addEventListener(event, function () {
                    form.classList.remove('is-dragover');
                });
            });
            form.addEventListener('drop', function (e) {
                droppedFiles = e.dataTransfer.files; // the files that were dropped
                showFiles(droppedFiles);

                document.getElementById('selected-files').files = droppedFiles;
            });
        }

        // Firefox focus bug fix for file input
        input.addEventListener('focus', function () {
            input.classList.add('has-focus');
        });
        input.addEventListener('blur', function () {
            input.classList.remove('has-focus');
        });

    });
}(document, window));
