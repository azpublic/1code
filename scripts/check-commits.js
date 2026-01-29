const https = require('https');
const fs = require('fs');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': '1code-fork-analyzer' }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function checkOwnerCommits(owner) {
  console.log(`\n=== @${owner} ===`);
  const commits = await fetchJSON(`https://api.github.com/repos/${owner}/1code/commits?per_page=20`);

  const unique = [];
  commits.forEach(c => {
    const msg = c.commit.message;
    const firstLine = msg.split('\n')[0];
    const author = c.author?.login || c.commit.author.name;
    const date = c.commit.author.date.split('T')[0];

    // Filter out sync/merge commits
    const lower = firstLine.toLowerCase();
    if (!lower.includes('merge') && !lower.includes('sync') && !lower.includes('upstream')) {
      unique.push({ sha: c.sha.substring(0,7), msg: firstLine, author, date });
    }
  });

  if (unique.length > 0) {
    console.log(`Unique commits (${unique.length}):`);
    unique.forEach(c => console.log(`  [${c.sha}] ${c.msg} (${c.author}, ${c.date})`));
  } else {
    console.log('No unique commits - just syncing with upstream');
  }

  return unique.length;
}

async function main() {
  const owners = ['aadivar', 'tum4y', 'CyizaLandry5', 'AndreiTelteu', 'namastex888'];

  for (const owner of owners) {
    try {
      await checkOwnerCommits(owner);
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
}

main().catch(console.error);
