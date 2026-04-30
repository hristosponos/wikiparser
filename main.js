
import fs from 'fs';
import * as cheerio from 'cheerio';
import md5 from 'md5';
import { exit } from 'process';
let cacheDir = import.meta.dirname + '/cache';

// Create cache folder if it doesnt exist
if(!fs.existsSync(cacheDir)){
    fs.mkdirSync(cacheDir);
}

let target =  '/wiki/Good_Friday';
let pagesScanned = 0;

async function parsePage(url){
    pagesScanned++;
    let body;
    const cacheFile = cacheDir + `/${md5(url)}`;
    let links = [];

    if(fs.existsSync(cacheFile)){
        console.log(`Cache hit for ${url}`);
        let fileContent = fs.readFileSync(cacheFile, 'utf-8');
        links = fileContent.split('\n');
        // Check if target link is in cached links
        if(links.includes(target)){
            console.log(`Found target link: ${target}. Scanned ${pagesScanned} pages.`);
            exit(0);
        }
    } else { 
        const $ = cheerio.load(body);
        // Parse all links from the wiki page
        $('#bodyContent a').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
                if (href.startsWith('#')) return;
                links.push(href);
                if (href === target) {
                    console.log(`Found target link: ${target}. Scanned ${pagesScanned} pages.`);
                    exit(0);
                }
            }
        });
    }

    // Store links in cache
    const linksCacheFile = cacheDir + `/${md5(url)}.links`;
    fs.writeFileSync(linksCacheFile, links.join('\n'), 'utf-8');

    // Recursively parse each link
    for (const link of links) {
        if (link.startsWith('/wiki/')) {
            await parsePage('https://en.wikipedia.org' + link);
        }
    }
}

parsePage('https://en.wikipedia.org/wiki/Artificial_intelligence');
