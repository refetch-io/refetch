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
        const appBaseUrl = process.env.APP_BASE_URL || 'https://refetch.io';
        
        // Validate required environment variables
        if (!appwriteEndpoint || !appwriteProjectId || !appwriteApiKey || !appwriteDatabaseId || !appwritePostsCollectionId) {
            throw new Error('Missing required Appwrite environment variables');
        }
        
        if (!githubToken || !githubOwner || !githubRepo) {
            throw new Error('Missing required GitHub environment variables');
        }
        
        log(`App base URL: ${appBaseUrl}`);
        
        log('Environment variables validated successfully');
        
        // Initialize Appwrite client
        const client = new Client()
            .setEndpoint(appwriteEndpoint)
            .setProject(appwriteProjectId)
            .setKey(appwriteApiKey);
        
        const databases = new Databases(client);
        
        // Fetch top 5 posts from the last 16 hours by score field
        log('Fetching top 5 posts from the last 16 hours from Appwrite...');
        log(`Database ID: ${appwriteDatabaseId}`);
        log(`Collection ID: ${appwritePostsCollectionId}`);
        
        // Calculate timestamp for 16 hours ago
        const sixteenHoursAgo = new Date(Date.now() - (16 * 60 * 60 * 1000));
        log(`Filtering posts created after: ${sixteenHoursAgo.toISOString()}`);
        
        const postsResponse = await databases.listDocuments(
            appwriteDatabaseId,
            appwritePostsCollectionId,
            [
                Query.greaterThan('$createdAt', sixteenHoursAgo.toISOString()),
                Query.orderDesc('score'),
                Query.limit(5),
                Query.select(['title', 'link', 'count', '$createdAt', '$id'])
            ]
        );
        
        if (!postsResponse.documents || postsResponse.documents.length === 0) {
            log('No posts found, skipping README update');
            return res.json({
                message: 'No posts found, README update skipped',
                status: 'success'
            });
        }
        
        log(`Found ${postsResponse.documents.length} posts from the last 16 hours`);
        
        // Log first post structure for debugging
        if (postsResponse.documents.length > 0) {
            const firstPost = postsResponse.documents[0];
            log(`Sample post structure: ${JSON.stringify({
                title: firstPost.title,
                link: firstPost.link,
                count: firstPost.count,
                createdAt: firstPost.$createdAt,
                id: firstPost.$id
            })}`);
        }
        
        // Format posts for README
        const formattedPosts = formatPostsForReadme(postsResponse.documents, appBaseUrl);
        
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
        
        // Get README template content
        log('Fetching README template from GitHub...');
        log(`GitHub Owner: ${githubOwner}`);
        log(`GitHub Repo: ${githubRepo}`);
        log(`GitHub Branch: ${githubBranch}`);
        
        let templateResponse;
        try {
            templateResponse = await octokit.rest.repos.getContent({
                owner: githubOwner,
                repo: githubRepo,
                path: 'README.template.md',
                ref: githubBranch
            });
            
            if (templateResponse.status !== 200) {
                throw new Error(`Failed to fetch README template: ${templateResponse.status}`);
            }
        } catch (templateError) {
            log(`GitHub API Error for template: ${templateError.message}`);
            log(`GitHub Error Status: ${templateError.status}`);
            log(`GitHub Error Response: ${JSON.stringify(templateError.response?.data || {})}`);
            
            // Check if it's a 404 (file not found) or other error
            if (templateError.status === 404) {
                throw new Error(`README.template.md not found in repository. Please check:
                1. Repository exists: ${githubOwner}/${githubRepo}
                2. Branch exists: ${githubBranch}
                3. README.template.md file exists in the root directory (this is required!)
                4. GitHub token has access to this repository
                
                Note: The function requires README.template.md to prevent news accumulation.`);
            }
            
            throw new Error(`GitHub template API error: ${templateError.message}`);
        }
        
        const templateContent = Buffer.from(templateResponse.data.content, 'base64').toString('utf-8');
        log('README template content fetched successfully');
        
        // Update template content with news
        const updatedContent = updateReadmeContent(templateContent, formattedPosts);
        
        // Get the current README.md file to get its latest SHA before updating
        log('Fetching current README.md to get latest SHA...');
        let currentReadmeSha = null;
        try {
            const currentReadmeResponse = await octokit.rest.repos.getContent({
                owner: githubOwner,
                repo: githubRepo,
                path: 'README.md',
                ref: githubBranch
            });
            currentReadmeSha = currentReadmeResponse.data.sha;
            log(`Current README.md SHA: ${currentReadmeSha}`);
        } catch (readmeError) {
            if (readmeError.status === 404) {
                log('README.md not found, will create new file');
                currentReadmeSha = null;
            } else {
                throw new Error(`Failed to fetch current README.md: ${readmeError.message}`);
            }
        }
        
        // Commit updated README to GitHub with retry logic
        log('Committing updated README to GitHub...');
        let commitResponse;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                commitResponse = await octokit.rest.repos.createOrUpdateFileContents({
                    owner: githubOwner,
                    repo: githubRepo,
                    path: 'README.md',
                    message: `🤖 Auto-update README with top posts - ${new Date().toISOString().split('T')[0]}`,
                    content: Buffer.from(updatedContent).toString('base64'),
                    sha: currentReadmeSha, // Use the current README.md SHA, not the template SHA
                    branch: githubBranch,
                    committer: {
                        name: 'Refetch Bot',
                        email: 'bot@refetch.io'
                    }
                });
                
                if (commitResponse.status === 200 || commitResponse.status === 201) {
                    break; // Success, exit retry loop
                }
                
                throw new Error(`Failed to commit README: ${commitResponse.status}`);
                
            } catch (commitError) {
                retryCount++;
                
                // If it's a 409 conflict (SHA mismatch), refresh the SHA and retry
                if (commitError.status === 409 && retryCount < maxRetries) {
                    log(`SHA mismatch detected (attempt ${retryCount}/${maxRetries}), refreshing README SHA...`);
                    
                    try {
                        const refreshResponse = await octokit.rest.repos.getContent({
                            owner: githubOwner,
                            repo: githubRepo,
                            path: 'README.md',
                            ref: githubBranch
                        });
                        currentReadmeSha = refreshResponse.data.sha;
                        log(`Refreshed README.md SHA: ${currentReadmeSha}`);
                        
                        // Wait a bit before retrying
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        continue;
                    } catch (refreshError) {
                        log(`Failed to refresh README SHA: ${refreshError.message}`);
                        throw new Error(`Failed to refresh README SHA after conflict: ${refreshError.message}`);
                    }
                }
                
                // If it's not a conflict or we've exhausted retries, throw the error
                if (retryCount >= maxRetries) {
                    throw new Error(`Failed to commit README after ${maxRetries} attempts: ${commitError.message}`);
                }
                
                throw commitError;
            }
        }
        
        if (!commitResponse || (commitResponse.status !== 200 && commitResponse.status !== 201)) {
            throw new Error(`Failed to commit README after all retry attempts`);
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
function formatPostsForReadme(posts, appBaseUrl) {
    const now = new Date();
    
    return posts.map((post, index) => {
        const postDate = new Date(post.$createdAt);
        const timeAgo = getTimeAgo(now - postDate);
        
        // Create discussion URL using the post ID
        const discussionUrl = `${appBaseUrl}/threads/${post.$id}`;
        
        return {
            title: post.title,
            url: discussionUrl, // Use discussion URL instead of external link
            externalUrl: post.link, // Keep external link for reference
            count: post.count,
            timeAgo: timeAgo,
            id: post.$id
        };
    });
}

/**
 * Update README content with new posts
 */
function updateReadmeContent(templateContent, posts) {
    // Create the news section content
    const newsSection = createNewsSection(posts);
    
    // Replace the {{news}} placeholder with actual content
    if (templateContent.includes('{{news}}')) {
        return templateContent.replace('{{news}}', newsSection);
    }
    
    // If no placeholder found, log warning and return template as-is
    log('Warning: {{news}} placeholder not found in README.template.md');
    log('Please ensure your template contains the {{news}} placeholder');
    return templateContent;
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
        
        // Limit title length to prevent line breaks (max ~80 characters)
        const trimmedTitle = post.title.length > 80 ? post.title.substring(0, 77) + '...' : post.title;
        
        html += `**${medal} [${trimmedTitle}](${post.url})**\n`;
        html += `📊 Votes: **${post.count}** | ⏰ ${post.timeAgo} | 🔗 [Original](${post.externalUrl})\n\n`;
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
