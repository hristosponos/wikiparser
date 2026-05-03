
import fs, { link } from 'fs';
import * as cheerio from 'cheerio';
import md5 from 'md5';
import { exit } from 'process';
import input from 'input';
let cacheDir = import.meta.dirname + '/parser-cache';

// Create cache folder if it doesnt exist
if(!fs.existsSync(cacheDir)){
    fs.mkdirSync(cacheDir);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const startPage = await input.text('Enter a Wikipedia page to start from (e.g. /wiki/Artificial_intelligence): ', { default: '/wiki/Artificial_intelligence' });
const target = await input.text('Enter a target Wikipedia page (e.g. /wiki/Robotics): ', { default: '/wiki/Robotics' });
let pagesScanned = 0;
let linkQueue = [];
let visited = new Set();


async function getLinksFromPage(url){
    pagesScanned++;
    const cacheFile = cacheDir + `/${md5(url)}.links`;
    let links = [];
    let fetchUrl;

    if(fs.existsSync(cacheFile)){
        console.log(`Cache hit for ${url}`);
        let fileContent = fs.readFileSync(cacheFile, 'utf-8');
        links = fileContent.split('\n').filter(link => link.trim());
        if(links.includes(target)){
            console.log(`- Found target link: ${target}. Scanned ${pagesScanned} pages.`);
            exit(0);
        }
    } else { 
        if (!url.includes('https://en.wikipedia.org')) 
            fetchUrl = 'https://en.wikipedia.org' + url;
        try {
            let res = await fetch(fetchUrl);
            await sleep(50);
            let body = await res.text();
            const $ = cheerio.load(body);
            console.log('+ Parsed ' + fetchUrl);

            $('#mw-content-text a').each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    if (href.startsWith('#') || !href.startsWith("/wiki/") || href.includes(":") || visited.has(href)) return;
                    links.push(href);
                    if (href === target) {
                        console.log(`Found target link: ${target}. Scanned ${pagesScanned} pages.`);
                        exit(0);
                    }
                }
            });
        } catch {
            console.error(`Failed to fetch ${url}`);
            return;
        }
    }

    fs.writeFileSync(cacheFile, links.join('\n'), 'utf-8');
    
    links.forEach(link => {
        if (!visited.has(link)) {
            linkQueue.push(link);
        }
    });
    
    return links;
}

//parsePage('/wiki/Artificial_intelligence');


async function main() {
    if (startPage && startPage.startsWith('/wiki/')) {
        linkQueue.push(startPage);
        visited.add(startPage);
        
        for (let i = 0; i < linkQueue.length; i++) {
            await getLinksFromPage(linkQueue[i]);
        }
    }
}

main();