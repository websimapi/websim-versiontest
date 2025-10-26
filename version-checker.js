async function checkForNewVersion() {
    console.log("Starting version check...");
    const loader = document.getElementById('loader');
    const content = document.getElementById('content');
    const projectIdSpan = document.getElementById('current-project-id');

    const showContent = () => {
        loader.classList.add('hidden');
        content.classList.remove('hidden');
    };

    try {
        // Fetch current project and its owner details in parallel
        const [project, owner] = await Promise.all([
            window.websim.getCurrentProject(),
            window.websim.getCreator()
        ]);

        const currentProjectId = project.id;
        const ownerId = owner.id;
        
        if (projectIdSpan) {
            projectIdSpan.textContent = currentProjectId;
        }

        console.log(`Current Project ID: ${currentProjectId}`);
        console.log(`Owner ID: ${ownerId}`);
        console.log(`Project Slug: ${project.slug}`);
        console.log(`Owner Username: ${owner.username}`);

        // Fetch comments for the current project
        const response = await fetch(`/api/v1/projects/${currentProjectId}/comments`);
        if (!response.ok) {
            throw new Error(`Failed to fetch comments: ${response.statusText}`);
        }
        const commentsData = await response.json();
        
        console.log("Fetched comments:", commentsData);

        let latestVersion = null;
        let latestVersionCommentFound = false;

        // Find the pinned comment by the owner
        if (commentsData && commentsData.comments && commentsData.comments.data) {
            for (const item of commentsData.comments.data) {
                const comment = item.comment;
                // A pinned comment by the project owner is the source of truth
                if (comment.author.id === ownerId && comment.pinned) {
                    const versionNumber = comment.raw_content.trim();
                    // Ensure the content is a valid version number (non-negative integer)
                    if (/^\d+$/.test(versionNumber)) {
                        latestVersion = versionNumber;
                        latestVersionCommentFound = true;
                        console.log(`Found pinned version comment by owner: Version ${latestVersion}`);
                        break; // Found the definitive version, no need to check others
                    }
                }
            }
        }

        if (latestVersionCommentFound) {
            // The user's prompt indicated a URL structure like /@username/slug/version
            const baseUrl = `https://websim.com/@${owner.username}/`;
            
            // The base slug is the project slug without any trailing version number.
            // e.g., if slug is "my-project/1", base slug is "my-project".
            // if slug is "my-project", base slug is "my-project".
            const baseSlug = project.slug.replace(/(?:\/\d+)?$/, '').split('/')[0];
            
            // Extract the current version from the URL path, if it exists.
            const currentPath = window.location.pathname;
            const currentVersionMatch = currentPath.match(/\/(\d+)$/);
            const currentVersion = currentVersionMatch ? currentVersionMatch[1] : null;

            console.log(`Base slug: ${baseSlug}, Current version: ${currentVersion}, Target version: ${latestVersion}`);

            // Redirect if the current version doesn't match the pinned version.
            // This handles cases where we are on a base slug (currentVersion is null) or an old version.
            if (latestVersion !== currentVersion) {
                const newUrl = `${baseUrl}${baseSlug}/${latestVersion}`;
                console.log(`New version found! Redirecting to ${newUrl}`);
                window.location.href = newUrl;
                return; // Stop execution to allow redirection
            } else {
                console.log("You are on the correct version specified in the pinned comment.");
                showContent();
            }
        } else {
            // No valid pinned version comment found from the owner.
            console.log("No pinned version comment found from the owner. This is considered the latest version.");
            showContent();
        }

    } catch (error) {
        console.error("An error occurred during the version check:", error);
        // If anything goes wrong, assume we're on the latest version and show the content.
        showContent();
        if (content) {
            const errorElement = document.createElement('p');
            errorElement.style.color = 'red';
            errorElement.textContent = 'Could not check for a new version. Please check the console for errors.';
            content.appendChild(errorElement);
        }
    }
}

// Run the check when the script loads
checkForNewVersion();