#!/usr/bin/env python3
"""
Fork Analysis Script for 1code
Analyzes GitHub forks to find interesting features and custom branches
"""

import requests
import json
import time
from datetime import datetime
from typing import List, Dict, Any

# Fork owners extracted from the API response
FORK_OWNERS = [
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
]

def fetch_github_api(url: str) -> Dict[str, Any]:
    """Fetch data from GitHub API with proper headers"""
    headers = {
        'User-Agent': '1code-Fork-Analysis-Script',
        'Accept': 'application/vnd.github.v3+json'
    }
    response = requests.get(url, headers=headers)

    if response.status_code == 403:
        print(f"Rate limited! Waiting 60 seconds...")
        time.sleep(60)
        response = requests.get(url, headers=headers)

    response.raise_for_status()
    return response.json()

def analyze_fork(owner: str) -> Dict[str, Any]:
    """Analyze a single fork repository"""
    try:
        print(f"Analyzing {owner}...", end='', flush=True)

        # Get repo details
        repo_data = fetch_github_api(f"https://api.github.com/repos/{owner}/1code")

        result = {
            'owner': owner,
            'url': f"https://github.com/{owner}/1code",
            'stars': repo_data.get('stargazers_count', 0),
            'description': repo_data.get('description', ''),
            'created_at': repo_data.get('created_at', ''),
            'updated_at': repo_data.get('updated_at', ''),
            'custom_branches': [],
            'branch_count': 0,
            'ahead_by': 0,
            'behind_by': 0,
            'recent_commits': [],
            'interesting': False,
            'error': None
        }

        # Get branches
        try:
            branches_data = fetch_github_api(f"https://api.github.com/repos/{owner}/1code/branches?per_page=100")
            custom_branches = [
                b['name'] for b in branches_data
                if b['name'] not in ['main', 'master']
            ]
            result['custom_branches'] = custom_branches
            result['branch_count'] = len(custom_branches)
        except Exception as e:
            print(f"Error fetching branches: {e}")

        # Get recent commits
        try:
            commits_data = fetch_github_api(f"https://api.github.com/repos/{owner}/1code/commits?per_page=10")
            result['recent_commits'] = [
                commit['commit']['message'].split('\n')[0]
                for commit in commits_data
            ]
        except Exception as e:
            print(f"Error fetching commits: {e}")

        # Get comparison with upstream
        try:
            comparison_data = fetch_github_api(
                f"https://api.github.com/repos/{owner}/1code/compare/21st-dev:main...{owner}:main"
            )
            result['ahead_by'] = comparison_data.get('ahead_by', 0)
            result['behind_by'] = comparison_data.get('behind_by', 0)
        except Exception as e:
            # Comparison might fail if branches don't match
            pass

        # Determine if interesting
        result['interesting'] = (
            result['branch_count'] > 0 or
            result['ahead_by'] > 0 or
            result['stars'] > 0
        )

        print(" ✓")
        time.sleep(0.5)  # Rate limiting
        return result

    except Exception as e:
        print(f" ✗ ({e})")
        return {
            'owner': owner,
            'error': str(e),
            'interesting': False
        }

def generate_report(results: List[Dict[str, Any]]) -> str:
    """Generate a structured report"""
    report = []
    report.append("# 1code Fork Analysis Report")
    report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")

    # Filter interesting forks
    interesting = [r for r in results if r.get('interesting', False)]
    interesting.sort(key=lambda x: (x.get('stars', 0), x.get('ahead_by', 0), x.get('branch_count', 0)), reverse=True)

    report.append(f"## Summary")
    report.append(f"- Total forks analyzed: {len(results)}")
    report.append(f"- Interesting forks: {len(interesting)}")
    report.append(f"- Forks with custom branches: {sum(1 for r in interesting if r.get('branch_count', 0) > 0)}")
    report.append(f"- Forks ahead of upstream: {sum(1 for r in interesting if r.get('ahead_by', 0) > 0)}")
    report.append(f"- Forked repos with stars: {sum(1 for r in interesting if r.get('stars', 0) > 0)}")
    report.append("")

    if interesting:
        report.append("## Most Interesting Forks")
        report.append("")

        for i, fork in enumerate(interesting[:20], 1):  # Top 20
            report.append(f"### {i}. {fork['owner']}")
            report.append(f"**URL:** {fork['url']}")
            report.append(f"**Stars:** {fork.get('stars', 0)}")

            if fork.get('description'):
                report.append(f"**Description:** {fork['description']}")

            if fork.get('branch_count', 0) > 0:
                report.append(f"**Custom Branches:** {', '.join(fork['custom_branches'])}")

            if fork.get('ahead_by', 0) > 0:
                report.append(f"**Ahead of upstream:** {fork['ahead_by']} commits")

            if fork.get('behind_by', 0) > 0:
                report.append(f"**Behind upstream:** {fork['behind_by']} commits")

            if fork.get('recent_commits'):
                # Filter out merge/sync commits
                unique_commits = [
                    c for c in fork['recent_commits']
                    if not any(keyword in c.lower() for keyword in ['merge', 'upstream', 'sync'])
                ]
                if unique_commits:
                    report.append("**Recent Unique Commits:**")
                    for commit in unique_commits[:3]:
                        report.append(f"  - {commit[:80]}")

            # Determine if worth investigating
            worth_investigating = (
                fork.get('stars', 0) >= 5 or
                fork.get('ahead_by', 0) >= 5 or
                fork.get('branch_count', 0) >= 2
            )
            if worth_investigating:
                report.append("**⚠️ WORTH INVESTIGATING**")

            report.append("")

    # Add recommendations
    report.append("## Recommendations")
    report.append("")

    top_forks = interesting[:5]
    if top_forks:
        report.append("### Top 5 Forks to Review:")
        for i, fork in enumerate(top_forks, 1):
            reasons = []
            if fork.get('stars', 0) > 0:
                reasons.append(f"{fork['stars']} stars")
            if fork.get('ahead_by', 0) > 0:
                reasons.append(f"{fork['ahead_by']} commits ahead")
            if fork.get('branch_count', 0) > 0:
                reasons.append(f"{fork['branch_count']} custom branches")

            reason_str = ", ".join(reasons) if reasons else "Active fork"
            report.append(f"{i}. **{fork['owner']}** - {reason_str}")
            report.append(f"   {fork['url']}")

    return "\n".join(report)

def main():
    """Main analysis function"""
    print("=" * 60)
    print("1code Fork Analysis")
    print("=" * 60)
    print(f"Analyzing {len(FORK_OWNERS)} forks...")
    print()

    results = []
    for owner in FORK_OWNERS:
        result = analyze_fork(owner)
        results.append(result)

    print()
    print("Generating report...")

    report = generate_report(results)

    # Save report
    report_file = "M:/claude_tools/1code/FORK_ANALYSIS_REPORT.md"
    with open(report_file, 'w') as f:
        f.write(report)

    print(f"Report saved to: {report_file}")
    print()

    # Print summary
    interesting = [r for r in results if r.get('interesting', False)]
    print(f"✓ Found {len(interesting)} interesting forks out of {len(results)} total")

    if interesting:
        print("\nTop 5 Most Interesting:")
        for i, fork in enumerate(interesting[:5], 1):
            print(f"{i}. {fork['owner']} ({fork['url']})")
            if fork.get('stars', 0) > 0:
                print(f"   ⭐ {fork['stars']} stars")
            if fork.get('branch_count', 0) > 0:
                print(f"   🌿 {fork['branch_count']} custom branches")
            if fork.get('ahead_by', 0) > 0:
                print(f"   ⬆️ {fork['ahead_by']} commits ahead")

if __name__ == "__main__":
    main()
