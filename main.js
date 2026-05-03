
import fs, { link } from 'fs';
import * as cheerio from 'cheerio';
import md5 from 'md5';
import { exit } from 'process';
import inquirer from 'inquirer';
let cacheDir = import.meta.dirname + '/parser-cache';

// Create cache folder if it doesnt exist
if(!fs.existsSync(cacheDir)){
    fs.mkdirSync(cacheDir);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


let target =  '/wiki/Good_Friday';
let pagesScanned = 0;
let linkQueue = [];


async function getLinksFromPage(url){
    pagesScanned++;
    const cacheFile = cacheDir + `/${md5(url)}.links`;
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
        if (!url.includes('https://en.wikipedia.org')) 
            url = 'https://en.wikipedia.org' + url;
        try {
            let res = await fetch(url);
            let body = await res.text();
            const $ = cheerio.load(body);
            console.log(`Parsed ${url}, found ${$('#bodyContent a').length} links.`);
            // Parse all links from the wiki page
            $('#bodyContent a').each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    if (href.startsWith('#') || !href.startsWith("/wiki/") || href.includes(":") || linkQueue.includes(href)) return;
                    links.push(href);
                    console.log(href, "\n", target)
                    if (('https://en.wikipedia.org' + href) === target) {
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

    // Store links in cache
    const linksCacheFile = cacheDir + `/${md5(url)}`;
    fs.writeFileSync(linksCacheFile, links.join('\n'), 'utf-8');
    
    await sleep(100);    
    
    return links;
    // Recurse on each link asynchronously
    for (const link of links) {
        setImmediate(() => parsePage(link)); // Use setImmediate to avoid stack overflow
        await sleep(1000);  
    }
}

//parsePage('/wiki/Artificial_intelligence');


async function main() {
    let startPage = await inquirer.prompt({
        type: 'input',
        name: 'startPage',
        message: 'Enter a Wikipedia page to start from (e.g. /wiki/Artificial_intelligence):'
    }).then(answers => {
        return answers.startPage;
    });

    if (startPage && startPage.startsWith('/wiki/')) {
        linkQueue.push(startPage);
        for (let i = 0; i < linkQueue.length; i++) {
            console.log(`Scanning page ${i + 1} of ${linkQueue.length}: ${linkQueue[i]}`);
            linkQueue.push(await getLinksFromPage(linkQueue[i]));
        }
    }
}

main();