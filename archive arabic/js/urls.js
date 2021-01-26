const NLP_URL = 'https://nlp.intalio.ml/';
const SOLR_URL = 'https://solr.intalio.ml/solr/insightDemo/';
const FACE_URL = 'https://face.intalio.ml/';
const ISEEQ_URL = 'https://insights.intalio.ml/';

function setUrl(key, url) {
    localStorage.setItem(key, url);
    eval(`${key} = "${url}"`);
}

$("#nlp-url").val(NLP_URL);
$("#nlp-url").change(function () {
    setUrl('NLP_URL', $(this).val());
});

$("#solr-url").val(SOLR_URL);
$("#solr-url").change(function () {
    setUrl('SOLR_URL', $(this).val());
});

$("#face-url").val(FACE_URL);
$("#face-url").change(function () {
    setUrl('FACE_URL', $(this).val());
});

$("#iseeq-url").val(ISEEQ_URL);
$("#iseeq-url").change(function () {
    setUrl('ISEEQ_URL', $(this).val());
});

$('#confirm_change_url').click(function () {
    $('#settings_modal').fadeOut('fast');
    $('.overlay').hide();
});
