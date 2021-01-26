const searchHeader = $('#video-search-header');
const tagClass = {
    'NNP': 'pos_important bg-success',
    'VPB': 'bg-success',
    'VBG': 'pos_important bg-danger bold',
    'NN': 'bg-danger',
    'DT': 'bg-warning'
};
const tagClassNames = {
    'NNP': 'Actor',
    'VBG': 'Action'
};
let queryText = '';

function getPOSTags(sentence) {
    return $.ajax({
        url: NLP_URL + 'api/tags/' + sentence,
        method: 'GET',
        dataType: 'json',
    });
}

function restoreSearchInput() {
    searchHeader.children()[0].remove();
    // searchHeader.prepend(`<input id="search-box" type="text" placeholder="Search for Movies or TV Series" aria-label="Search">`);
    search_input.show();
    console.log(queryText);
    search_input.val(queryText);
}

function getSentenceFaces(sentence) {
    return new Promise((resolve, reject) => {
        getPOSTags(sentence).done(function (data) {
            const faces = [];
            const objects = [];

            // empty text input
            queryText = search_input.val();
            search_input.val('');
            let code = `<code class="pos" onclick="restoreSearchInput()">`;
            data.forEach(function (word) {
                // colorize pos
                code += `<span data-toggle="tooltip" data-placement="bottom"
                               ${word[1] in tagClassNames ? 'title="' + tagClassNames[word[1]] + '"' : ''}
                               class="pos_word ${word[1] in tagClass ? tagClass[word[1]] : 'bg-dark'}">${word[0]}</span> `;
                // add faces
                if (word[1].includes('NNP'))
                    faces.push(word[0]);

                // add objects
                if (word[1].includes('VBG') || word[1] === 'NN')
                    objects.push(word[0]);
            });

            code += `</code>`;
            search_input.hide();
            $('code.pos').remove();
            searchHeader.prepend(code);

            $('[data-toggle="tooltip"]').tooltip();

            const pos = $('.pos');
            pos.css('padding-right', Math.abs(search_input.width() - pos.width()));
            return resolve({'faces': faces, 'objects': objects});
        }).fail(function(e) {
            reject(e);
        });
    });
}
