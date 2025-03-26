import Fs from 'fs';
import Path from 'path';
import Jsdom from 'jsdom';
import sqlite3 from 'better-sqlite3';

const onegrams = new Map();
const twograms = new Map();
let wordtotal = 0;
let linknum = 0;

const db = new sqlite3('../corpus/wordindex/wordindex.db');

const paths = [
    'Kuruntokai',
    'Narrinai',
    'Akananuru',
    'Purananuru', 
    'Ainkurunuru',
    'Kalittokai',
    'TamilneriVilakkam',
    'Tirukkural',
    'Cilappatikaram',
    'Manimekalai',
    'NalayiratTivviyapPirapantam',
    'Tolkappiyam',
];

const featureMap = new Map([
    ['noun','n'],
    ['pronoun','pr'],
    ['adjective','ad'],
    ['verbal noun','vn'],
    ['pronominalised noun','pn'],
    ['participial noun','pt'],
    ['verbal root','vr'],
    ['root noun','rn'],
    ['finite verb','fv'],
    ['peyareccam','py'],
    ['infinitive','in'],
    ['absolutive','ab'],
    ['habitual future','hf'],
    ['conditional','cd'],
    ['imperative','im'],
    ['optative','op'],
    ['subjunctive','su'],
    ['interjection','ij']
]);
const aspectMap = new Map([
    ['imperfective aspect','ia'],
    ['perfective aspect','pa']
]);

const reverseMap = new Map([...featureMap,aspectMap].map(e => [...e].reverse()));
const go = () => {
    for(const dir of paths) {
        const files = Fs.readdirSync('../corpus/'+dir);
        const flist = [];
        files.forEach(f => {
            if(/\.xml$/.test(f))
                flist.push('../corpus/'+dir + '/' + f);
        });
        readfiles(dir,flist);
    }
    writeout();
};

const dbcache = new Map();

const dbGetPos = form => {
    const posrow = db.prepare('SELECT pos FROM citations WHERE form = ? and pos IS NOT NULL').get(form);
    if(posrow) {
        const f = featureMap.get(posrow.pos);
        dbcache.set(form,f);
        return f;
    }
    const aspectrow = db.prepare('SELECT aspect FROM citations WHERE form = ? and aspect IS NOT NULL').get(form);
    if(aspectrow) {
        const aspect = aspectMap.get(aspectrow.aspect);
        if(aspect) {
            dbcache.set(form,aspect);
            return aspect;
        }
    }
    return false;
};

const getPos = (el,form) => {
    const grams = el.querySelectorAll('gram[type="role"]');
    let aspect = 'o';
    for(const gram of grams) {
        const text = gram.textContent;
        const feature = featureMap.get(text);
        if(feature)
            return feature;
        const feature2 = aspectMap.get(text);
        if(feature2) aspect = feature2;
    }
    if(aspect === 'o') {
        const dbres = dbcache.get(form) || dbGetPos(form);
        if(dbres) aspect = dbres;
    }
    return aspect;
};

const readfiles = (dir,arr) => {
    console.log(dir);

    for(const fname of arr) {
        const str = Fs.readFileSync(fname,{encoding: 'utf-8'});
        const dom = new Jsdom.JSDOM('');
        const parser = new dom.window.DOMParser();
        const doc = parser.parseFromString(str,'text/xml');
        const standoffs = doc.querySelectorAll('standOff[type="wordsplit"]');
        if(standoffs.length === 0) continue;
        for(const standoff of standoffs) {
            const poemnum = standoff.getAttribute('corresp').replace(/^#/,'');
            const entries = standoff.querySelectorAll(':scope > entry');
            const words = [];
            for(const el of entries) {
                let form = '';
                const simple = el.querySelector('form[type="simple"]');
                if(simple) form = simple.textContent;
                else {
                    const form1 = el.querySelector('form').cloneNode(true);
                    for(const pc of form1.querySelectorAll('c[type="geminated"], c[type="glide"],c[type="inserted"], note')) pc.remove();
                    form = form1.textContent;
                }
                if(form.startsWith('(')) continue; //TODO: fix this
                const pos = getPos(el,form);
                // TODO: POS 
                words.push(form + `|${pos}`);
            }
            //.flat().filter(f => f !== '');
            //for(let n=0;n<words.length;n++) {
                wordtotal = wordtotal + words.length;
                appendNgrams(words,1,onegrams,0,poemnum);
                appendNgrams(words,2,twograms,0,poemnum);
                //appendNgrams(words,2,twograms,1,poemnum);
            //}
        }
    }
};
const writeout = () => {
    const npmi = new Map();
    for(const [gram,obj] of twograms) {
        const freq = obj.count;
        //if(freq === 1) continue; // include hapaxes?
        const [xcount,ycount] = gram.split(' ').map(g => onegrams.get(g).count);
        //if(xcount === 1 || ycount === 1) continue; // include hapaxes?
        const [px,py] = [xcount/wordtotal,ycount/wordtotal];
        const pxy = freq/wordtotal;
        npmi.set(gram, Math.log(pxy/(px * py)) / (-Math.log(pxy)));
        //npmi.set(gram, Math.log(pxy**2/(px * py)));
    }
    const nodes = [...onegrams].toSorted((a,b) => b[1] > a[1] ? -1 : 1)
                               .map(c => {
                                 let [form, pos] = c[0].split('|');
                                 /*
                                 if(pos === 'other') {
                                    const regex = new RegExp('^'+
                                        form.replaceAll('(','\\(').replaceAll(')','\\)')+
                                        '%%(?!other)');
                                    const found = nodenames.find(e => e.match(regex));
                                    if(found)
                                        pos = found.split('%%')[1];
                                 }
                                 */
                                 return {id: c[0], form: form, size: c[1].count, type: pos || 'o'};
                                });
    /*
    const out2 = [...twograms].toSorted((a,b) => b[1] - a[1])
                             .map(c => `${c[0]},${c[1]}`)
                             .join('\n');
    */
    const links = [...npmi].toSorted((a,b) => b[1] > a[1] ? -1 : 1)
                           .map(c => {
                                 linknum = linknum + 1;
                                 const split = c[0].split(/\s+/);
                                 const ret = {
                                    id: linknum,
                                    source: split[0],
                                    target: split[1],
                                    strength: c[1],
                                    citations: [...twograms.get(c[0]).citations].toSorted((a,b) => a.replaceAll(/\D/g,'') < b.replaceAll(/\D/g,'') ? -1 : 1)
                                 };
                                 if(split[0] === split[1])
                                     ret.curvature = 0.5;
                                 else if(npmi.has(`${split[1]} ${split[0]}`))
                                     ret.curvature = 0.25;
                                 return ret;
                             });

    //Fs.writeFileSync('1grams.csv',out1);
    //Fs.writeFileSync('2grams.csv',out2);
    //Fs.writeFileSync('npmi.csv',out3);
    Fs.writeFileSync('collocations.json',JSON.stringify({nodes: nodes, links: links}));
    console.log(`nodes: ${nodes.length}`);
    console.log(`links: ${links.length}`);
};

const appendNgrams = (arr, n, collated, skip, poemnum) => {
    n = parseInt(n);
    const grams = [];
    for(let i=0; i < arr.length - n - skip+1; i++) {
        const sub = [];
        for(let j=i; j < i + n + (n-1)*skip; j = j + 1 + skip)
            sub.push(arr[j]);
        const gram = sub.join(' ');
        const inmap = collated.get(gram);
        if(inmap) {
            inmap.count = inmap.count + 1;
            inmap.citations.add(poemnum);
        }
        else
            collated.set(gram,{count: 1, citations: new Set([poemnum])});
    }
};

go();
