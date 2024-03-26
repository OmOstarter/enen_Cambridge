/* global api */
class encn_Cambridge {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        let locale = await api.locale();
        if (locale.indexOf('CN') != -1) return '剑桥英英词典';
        if (locale.indexOf('TW') != -1) return '劍橋英英詞典';
        return 'Cambridge English Dictionary';
    }

    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        let results = await Promise.all([this.findCambridge(word)]);
        return [].concat(...results).filter(x => x);
    }

    async findCambridge(word) {
        let notes = [];
        if (!word) return notes;

        function T(node) {
            if (!node) return '';
            else return node.innerText.trim();
        }

        let base = 'https://dictionary.cambridge.org/dictionary/english/';
        let url = base + encodeURIComponent(word);
        let doc = '';
        try {
            let data = await api.fetch(url);
            let parser = new DOMParser();
            doc = parser.parseFromString(data, 'text/html');
        } catch (err) {
            return [];
        }

        let entries = doc.querySelectorAll('.pr.entry-body__el') || [];
        for (const entry of entries) {
            let definitions = [];
            let expression = T(entry.querySelector('.headword'));
            let reading = T(entry.querySelector('.pron .ipa'));
            let audios = [];
            let audioslinks = entry.querySelectorAll('source');
            if (audioslinks)
                audioslinks.forEach(link => audios.push(link.getAttribute('src')));

            let pos = T(entry.querySelector('.posgram'));
            pos = pos ? `<span class="pos">${pos}</span>` : '';
            
            let defblocks = entry.querySelectorAll('.sense-block') || [];
            for (const defblock of defblocks) {
                let eng_tran = T(defblock.querySelector('.def-head .def'));
                if (!eng_tran) continue;
                let definition = '';
                eng_tran = `<span class='eng_tran'>${eng_tran}</span>`;
                definition += `${pos}${eng_tran}`;

                let examps = defblock.querySelectorAll('.examp') || [];
                if (examps.length > 0 && this.maxexample > 0) {
                    definition += '<ul class="sents">';
                    for (const [index, examp] of examps.entries()) {
                        if (index > this.maxexample - 1) break;
                        let eng_examp = T(examp).replace(RegExp(expression, 'gi'),`<b>${expression}</b>`);
                        definition += `<li class='sent'><span class='eng_sent'>${eng_examp}</span></li>`;
                    }
                    definition += '</ul>';
                }
                definition && definitions.push(definition);
            }
            
            let css = this.renderCSS();
            notes.push({
                css,
                expression,
                reading,
                definitions,
                audios,
            });
        }
        return notes;
    }

    renderCSS() {
        let css = `
            <style>
                span.pos  {text-transform:lowercase; font-size:0.9em; margin-right:5px; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
                span.tran {margin:0; padding:0;}
                span.eng_tran {margin-right:3px; padding:0;}
                ul.sents {font-size:0.9em; list-style:square inside; margin:3px 0;padding:5px;background:rgba(13,71,161,0.1); border-radius:5px;}
                li.sent  {margin:0; padding:0;}
                span.eng_sent {margin-right:5px;}
            </style>`;
        return css;
    }
}
