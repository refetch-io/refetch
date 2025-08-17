/**
 * README Updater Function
 * 
 * This function automatically updates the README.md file with the top 5 highest-scoring posts.
 * It fetches posts from Appwrite, formats them, and updates the GitHub repository using the GitHub API.
 */

import { Client, Databases, Query } from 'node-appwrite';
import { Octokit } from 'octokit';

export default async function ({ req, res, log, error }) {
    try {
        log('Starting README update process...');
        
        // Get environment variables
        const appwriteEndpoint = process.env.APPWRITE_ENDPOINT;
        const appwriteProjectId = process.env.APPWRITE_PROJECT_ID;
        const appwriteApiKey = process.env.APPWRITE_API_KEY;
        const appwriteDatabaseId = process.env.APPWRITE_DATABASE_ID;
        const appwritePostsCollectionId = process.env.APPWRITE_POSTS_COLLECTION_ID;
        
        const githubToken = process.env.GITHUB_TOKEN;
        const githubOwner = process.env.GITHUB_OWNER;
        const githubRepo = process.env.GITHUB_REPO;
        const githubBranch = process.env.GITHUB_BRANCH || 'main';
        
        // Validate required environment variables
        if (!appwriteEndpoint || !appwriteProjectId || !appwriteApiKey || !appwriteDatabaseId || !appwritePostsCollectionId) {
            throw new Error('Missing required Appwrite environment variables');
        }
        
        if (!githubToken || !githubOwner || !githubRepo) {
            throw new Error('Missing required GitHub environment variables');
        }
        
        log('Environment variables validated successfully');
        
        // Initialize Appwrite client
        const client = new Client()
            .setEndpoint(appwriteEndpoint)
            .setProject(appwriteProjectId)
            .setKey(appwriteApiKey);
        
        const databases = new Databases(client);
        
        // Fetch top 5 posts by score field (or count if score doesn't exist)
        log('Fetching top 5 posts from Appwrite...');
        log(`Database ID: ${appwriteDatabaseId}`);
        log(`Collection ID: ${appwritePostsCollectionId}`);
        
        const postsResponse = await databases.listDocuments(
            appwriteDatabaseId,
            appwritePostsCollectionId,
            [
                Query.orderDesc('score'),
                Query.limit(5),
                Query.select(['title', 'link', 'score', 'count', 'countUp', 'countDown', '$createdAt', 'userName'])
            ]
        );
        
        if (!postsResponse.documents || postsResponse.documents.length === 0) {
            log('No posts found, skipping README update');
            return res.json({
                message: 'No posts found, README update skipped',
                status: 'success'
            });
        }
        
        log(`Found ${postsResponse.documents.length} posts`);
        
        // Log first post structure for debugging
        if (postsResponse.documents.length > 0) {
            const firstPost = postsResponse.documents[0];
            log(`Sample post structure: ${JSON.stringify({
                title: firstPost.title,
                link: firstPost.link,
                score: firstPost.score,
                count: firstPost.count,
                countUp: firstPost.countUp,
                countDown: firstPost.countDown,
                createdAt: firstPost.$createdAt,
                userName: firstPost.userName
            })}`);
        }
        
        // Format posts for README
        const formattedPosts = formatPostsForReadme(postsResponse.documents);
        
        // Initialize GitHub client
        const octokit = new Octokit({
            auth: githubToken
        });
        
        // Test GitHub repository access first
        log('Testing GitHub repository access...');
        try {
            const repoResponse = await octokit.rest.repos.get({
                owner: githubOwner,
                repo: githubRepo
            });
            log(`Repository found: ${repoResponse.data.full_name}`);
            log(`Default branch: ${repoResponse.data.default_branch}`);
            
            // Check if the specified branch exists
            try {
                const branchResponse = await octokit.rest.repos.getBranch({
                    owner: githubOwner,
                    repo: githubRepo,
                    branch: githubBranch
                });
                log(`Branch found: ${branchResponse.data.name}`);
            } catch (branchError) {
                log(`Branch access error: ${branchError.message}`);
                if (branchError.status === 404) {
                    throw new Error(`Branch '${githubBranch}' not found in repository. Available branches might be: ${repoResponse.data.default_branch}. Please check:
                    1. Branch name is correct
                    2. Branch exists in the repository
                    3. Try using the default branch: ${repoResponse.data.default_branch}`);
                }
                throw new Error(`GitHub branch access error: ${branchError.message}`);
            }
        } catch (repoError) {
            log(`Repository access error: ${repoError.message}`);
            if (repoError.status === 404) {
                throw new Error(`Repository not found: ${githubOwner}/${githubRepo}. Please check:
                1. Repository name is correct
                2. Repository is not private (or token has access)
                3. GitHub token has correct permissions`);
            }
            throw new Error(`GitHub repository access error: ${repoError.message}`);
        }
        
        // Get current README content
        log('Fetching current README content from GitHub...');
        log(`GitHub Owner: ${githubOwner}`);
        log(`GitHub Repo: ${githubRepo}`);
        log(`GitHub Branch: ${githubBranch}`);
        
        let readmeResponse;
        try {
            readmeResponse = await octokit.rest.repos.getContent({
                owner: githubOwner,
                repo: githubRepo,
                path: 'README.md',
                ref: githubBranch
            });
            
            if (readmeResponse.status !== 200) {
                throw new Error(`Failed to fetch README: ${readmeResponse.status}`);
            }
        } catch (githubError) {
            log(`GitHub API Error: ${githubError.message}`);
            log(`GitHub Error Status: ${githubError.status}`);
            log(`GitHub Error Response: ${JSON.stringify(githubError.response?.data || {})}`);
            
            // Check if it's a 404 (file not found) or other error
            if (githubError.status === 404) {
                throw new Error(`README.md not found in repository. Please check:
                1. Repository exists: ${githubOwner}/${githubRepo}
                2. Branch exists: ${githubBranch}
                3. README.md file exists in the root directory
                4. GitHub token has access to this repository`);
            }
            
            throw new Error(`GitHub API error: ${githubError.message}`);
        }
        
        const currentContent = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
        log('Current README content fetched successfully');
        
        // Update README content
        const updatedContent = updateReadmeContent(currentContent, formattedPosts);
        
        // Commit updated README to GitHub
        log('Committing updated README to GitHub...');
        const commitResponse = await octokit.rest.repos.createOrUpdateFileContents({
            owner: githubOwner,
            repo: githubRepo,
            path: 'README.md',
            message: `🤖 Auto-update README with top posts - ${new Date().toISOString().split('T')[0]}`,
            content: Buffer.from(updatedContent).toString('base64'),
            sha: readmeResponse.data.sha,
            branch: githubBranch,
            committer: {
                name: 'Refetch Bot',
                email: 'bot@refetch.io'
            }
        });
        
        if (commitResponse.status !== 200 && commitResponse.status !== 201) {
            throw new Error(`Failed to commit README: ${commitResponse.status}`);
        }
        
        log('README updated successfully on GitHub');
        
        return res.json({
            message: 'README updated successfully',
            postsUpdated: postsResponse.documents.length,
            commitSha: commitResponse.data.commit.sha,
            status: 'success'
        });
        
    } catch (err) {
        error(`Error in README updater function: ${err.message}`);
        error(`Stack trace: ${err.stack}`);
        
        return res.json({
            message: 'Error occurred while updating README',
            error: err.message,
            status: 'error'
        }, 500);
    }
}

/**
 * Format posts for README display
 */
function formatPostsForReadme(posts) {
    const now = new Date();
    
    return posts.map((post, index) => {
        const postDate = new Date(post.$createdAt);
        const timeAgo = getTimeAgo(now - postDate);
        
        return {
            title: post.title,
            url: post.link,
            score: post.score,
            timeAgo: timeAgo,
            author: post.userName || 'Anonymous'
        };
    });
}

/**
 * Update README content with new posts
 */
function updateReadmeContent(currentContent, posts) {
    // Create the news section content
    const newsSection = createNewsSection(posts);
    
    // Replace the {{news}} placeholder with actual content
    if (currentContent.includes('{{news}}')) {
        return currentContent.replace('{{news}}', newsSection);
    }
    
    // If no placeholder found, add the news section after the description
    const descriptionEnd = currentContent.indexOf('### What We\'re Building');
    if (descriptionEnd !== -1) {
        return currentContent.slice(0, descriptionEnd) + newsSection + '\n\n' + currentContent.slice(descriptionEnd);
    }
    
    // Fallback: add at the end
    return currentContent + '\n\n' + newsSection;
}

/**
 * Create the news section HTML content
 */
function createNewsSection(posts) {
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    let html = `<div align="center">\n\n`;
    html += `## 🔥 Top Posts Today (${currentDate})\n\n`;
    html += `*Auto-updated with the highest-scoring community content*\n\n`;
    html += `</div>\n\n`;
    
    posts.forEach((post, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐';
        html += `**${medal} [${post.title}](${post.url})**\n`;
        html += `📊 Score: **${post.score}** | ⏰ ${post.timeAgo} | 👤 ${post.author}\n\n`;
    });
    
    html += `---\n\n`;
    html += `*Last updated: ${new Date().toISOString()}*\n\n`;
    
    return html;
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
        return 'Just now';
    }
}
