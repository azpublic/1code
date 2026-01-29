#!/usr/bin/env bun
/**
 * Fork Analysis Script for 1code
 * Analyzes GitHub forks to find interesting features and custom branches
 */

const FORK_OWNERS = [
  "MorpheusEMH", "pichimail", "amal-irgashev", "adilsarfraz02", "CCwithAi",
  "xjayk", "sdamarketing", "dodabuilt", "threatseeker", "maxcp-dd",
  "tahoery", "BruceICzw", "zxx2112", "Simpl3Jack", "Illgot",
  "ahao0150", "ktisakib", "uvtechnologyins", "148K", "jagannathsunani66-svg",
  "omarfattah44", "keysemails", "ramarivera", "Connorbelez", "badibadey",
  "nainishshafi", "ak56434189-sketch", "azpublic", "yarstann", "yeasin2002",
  "xxw-xp", "okisdev", "fixcode-h", "aiob3", "a3my",
  "TbusOS", "narvinIR", "aakash4dev", "0x-m1cro", "zhenbah",
  "nilskroe", "anhdd-kuro", "appdirectory", "Godzizizilla", "mariomile",
  "berkipekoglu", "hvnvibz", "mows333", "rawhit-r", "tylergraydev",
  "w159", "royashoya", "premanand8800", "maxthraxx", "GoraAI",
  "JoziGila", "sandriaas", "crazyboyonline", "felix-zoe", "reham00025",
  "078sky", "heshangcode", "okgoodok123", "ChrisPei", "CodeHourra",
  "kazhuyo", "cleardry", "prathamdby", "CorentinLumineau", "krmao",
  "ronkaldes", "pete1313", "wushanru", "Abouzeid", "MaTriXy",
  "AbdullahTerro", "phoxiao", "ca-x", "Wikiup", "mibotech-ai",
  "hongshancapital", "TheMorganAlistair", "seanly", "mjbin888", "Stoplossking1",
  "ahmedaarab103", "Ahmedalsadi-1", "codemeasandwich", "ishimwekevinfounder", "Frank-III",
  "chujianyun", "newstart0514", "hadimousavi79", "RandomSynergy17", "wiobip",
  "kaallliiii6", "a25varshney", "fuzz2410", "katrinavassell", "gitjfmd"
];

interface ForkResult {
  owner: string;
  url: string;
  stars: number;
  description: string;
  customBranches: string[];
  branchCount: number;
  aheadBy: number;
  behindBy: number;
  recentCommits: string[];
  interesting: boolean;
  error?: string;
}

async function fetchGitHub(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': '1code-Fork-Analysis',
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (response.status === 403) {
    console.log('Rate limited! Waiting 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    return fetchGitHub(url);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function analyzeFork(owner: string): Promise<ForkResult> {
  try {
    process.stdout.write(`Analyzing ${owner}...`);

    const repo = await fetchGitHub(`https://api.github.com/repos/${owner}/1code`);

    const result: ForkResult = {
      owner,
      url: `https://github.com/${owner}/1code`,
      stars: repo.stargazers_count || 0,
      description: repo.description || '',
      customBranches: [],
      branchCount: 0,
      aheadBy: 0,
      behindBy: 0,
      recentCommits: [],
      interesting: false
    };

    // Get branches
    try {
      const branches = await fetchGitHub(`https://api.github.com/repos/${owner}/1code/branches?per_page=100`);
      result.customBranches = branches
        .filter((b: any) => b.name !== 'main' && b.name !== 'master')
        .map((b: any) => b.name);
      result.branchCount = result.customBranches.length;
    } catch (e) {
      // Ignore branch errors
    }

    // Get commits
    try {
      const commits = await fetchGitHub(`https://api.github.com/repos/${owner}/1code/commits?per_page=10`);
      result.recentCommits = commits.map((c: any) => c.commit.message.split('\n')[0]);
    } catch (e) {
      // Ignore commit errors
    }

    // Get comparison
    try {
      const comparison = await fetchGitHub(
        `https://api.github.com/repos/${owner}/1code/compare/21st-dev:main...${owner}:main`
      );
      result.aheadBy = comparison.ahead_by || 0;
      result.behindBy = comparison.behind_by || 0;
    } catch (e) {
      // Comparison might fail
    }

    result.interesting = result.branchCount > 0 || result.aheadBy > 0 || result.stars > 0;

    console.log(' ✓');
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    return result;

  } catch (error) {
    console.log(` ✗ (${error})`);
    return {
      owner,
      url: `https://github.com/${owner}/1code`,
      stars: 0,
      description: '',
      customBranches: [],
      branchCount: 0,
      aheadBy: 0,
      behindBy: 0,
      recentCommits: [],
      interesting: false,
      error: String(error)
    };
  }
}

function generateReport(results: ForkResult[]): string {
  const lines: string[] = [];

  lines.push('# 1code Fork Analysis Report');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  const interesting = results
    .filter(r => r.interesting)
    .sort((a, b) => b.stars - a.stars || b.aheadBy - a.aheadBy || b.branchCount - a.branchCount);

  lines.push('## Summary');
  lines.push(`- Total forks analyzed: ${results.length}`);
  lines.push(`- Interesting forks: ${interesting.length}`);
  lines.push(`- Forks with custom branches: ${interesting.filter(r => r.branchCount > 0).length}`);
  lines.push(`- Forks ahead of upstream: ${interesting.filter(r => r.aheadBy > 0).length}`);
  lines.push(`- Forked repos with stars: ${interesting.filter(r => r.stars > 0).length}`);
  lines.push('');

  if (interesting.length > 0) {
    lines.push('## Most Interesting Forks');
    lines.push('');

    interesting.slice(0, 20).forEach((fork, i) => {
      lines.push(`### ${i + 1}. ${fork.owner}`);
      lines.push(`**URL:** ${fork.url}`);
      lines.push(`**Stars:** ${fork.stars}`);

      if (fork.description) {
        lines.push(`**Description:** ${fork.description}`);
      }

      if (fork.branchCount > 0) {
        lines.push(`**Custom Branches:** ${fork.customBranches.join(', ')}`);
      }

      if (fork.aheadBy > 0) {
        lines.push(`**Ahead of upstream:** ${fork.aheadBy} commits`);
      }

      if (fork.behindBy > 0) {
        lines.push(`**Behind upstream:** ${fork.behindBy} commits`);
      }

      if (fork.recentCommits.length > 0) {
        const uniqueCommits = fork.recentCommits.filter(m =>
          !/merge|upstream|sync/i.test(m)
        );
        if (uniqueCommits.length > 0) {
          lines.push('**Recent Unique Commits:**');
          uniqueCommits.slice(0, 3).forEach(c => {
            lines.push(`  - ${c.substring(0, 80)}`);
          });
        }
      }

      const worthInvestigating = fork.stars >= 5 || fork.aheadBy >= 5 || fork.branchCount >= 2;
      if (worthInvestigating) {
        lines.push('**⚠️ WORTH INVESTIGATING**');
      }

      lines.push('');
    });
  }

  lines.push('## Recommendations');
  lines.push('');

  if (interesting.length > 0) {
    lines.push('### Top 5 Forks to Review:');
    interesting.slice(0, 5).forEach((fork, i) => {
      const reasons: string[] = [];
      if (fork.stars > 0) reasons.push(`${fork.stars} stars`);
      if (fork.aheadBy > 0) reasons.push(`${fork.aheadBy} commits ahead`);
      if (fork.branchCount > 0) reasons.push(`${fork.branchCount} custom branches`);

      const reasonStr = reasons.length > 0 ? reasons.join(', ') : 'Active fork';
      lines.push(`${i + 1}. **${fork.owner}** - ${reasonStr}`);
      lines.push(`   ${fork.url}`);
    });
  }

  return lines.join('\n');
}

async function main() {
  console.log('='.repeat(60));
  console.log('1code Fork Analysis');
  console.log('='.repeat(60));
  console.log(`Analyzing ${FORK_OWNERS.length} forks...\n`);

  const results: ForkResult[] = [];

  for (const owner of FORK_OWNERS) {
    const result = await analyzeFork(owner);
    results.push(result);
  }

  console.log('\nGenerating report...\n');

  const report = generateReport(results);

  const reportPath = 'M:/claude_tools/1code/FORK_ANALYSIS_REPORT.md';
  await Bun.write(reportPath, report);

  console.log(`Report saved to: ${reportPath}\n`);

  const interesting = results.filter(r => r.interesting);
  console.log(`✓ Found ${interesting.length} interesting forks out of ${results.length} total`);

  if (interesting.length > 0) {
    console.log('\nTop 5 Most Interesting:');
    interesting.slice(0, 5).forEach((fork, i) => {
      console.log(`${i + 1}. ${fork.owner} (${fork.url})`);
      if (fork.stars > 0) console.log(`   ⭐ ${fork.stars} stars`);
      if (fork.branchCount > 0) console.log(`   🌿 ${fork.branchCount} custom branches`);
      if (fork.aheadBy > 0) console.log(`   ⬆️ ${fork.aheadBy} commits ahead`);
    });
  }
}

main().catch(console.error);
