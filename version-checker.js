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

        // Find the pinned comment by the owner
        if (commentsData && commentsData.comments && commentsData.comments.data) {
            for (const item of commentsData.comments.data) {
                const comment = item.comment;
                if (comment.author.id === ownerId && comment.pinned) {
                    const versionNumber = comment.raw_content.trim();
                    // Ensure the content is a valid version number (integer)
                    if (/^\d+$/.test(versionNumber)) {
                        latestVersion = versionNumber;
                        console.log(`Found pinned version comment by owner: Version ${latestVersion}`);
                        break; // Found the definitive version, no need to check others
                    }
                }
            }
        }

        if (latestVersion) {
            // The user's prompt indicated a URL structure like /@username/slug/version
            // Let's adopt this instead of slug-version for more clarity.
            const baseUrl = `https://websim.com/@${owner.username}/`;
            const baseSlug = project.slug.replace(/\/\d+$/, ''); // Remove trailing /<version>
            const currentPath = window.location.pathname;
            const currentVersionMatch = currentPath.match(/\/(\d+)$/);
            const currentVersion = currentVersionMatch ? currentVersionMatch[1] : null;

            console.log(`Base slug: ${baseSlug}, Current version: ${currentVersion}, Target version: ${latestVersion}`);

            // Redirect if the current version doesn't match the pinned version
            if (latestVersion !== currentVersion) {
                const newUrl = `${baseUrl}${baseSlug}/${latestVersion}`;
                console.log(`New version found! Redirecting to ${newUrl}`);
                window.location.href = newUrl;
                return; // Stop execution to allow redirection
            } else {
                console.log("Already on the version specified in the pinned comment.");
                showContent();
            }
        } else {
            // No pinned version comment found from the owner. This is the latest version.
            console.log("No pinned version comment found. This is the latest version.");
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