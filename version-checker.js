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

        // Fetch comments for the current project
        const response = await fetch(`/api/v1/projects/${currentProjectId}/comments`);
        if (!response.ok) {
            throw new Error(`Failed to fetch comments: ${response.statusText}`);
        }
        const commentsData = await response.json();
        
        console.log("Fetched comments:", commentsData);

        const versionRegex = /^VERSION:([a-zA-Z0-9_-]+)$/;
        let latestVersionProjectId = null;

        // The API returns comments chronologically (oldest first), so we reverse the array to check the newest comments first.
        const comments = commentsData.data.slice().reverse();

        for (const item of comments) {
            const comment = item.comment;
            // We only trust version comments from the project owner.
            if (comment.author.id === ownerId) {
                const match = comment.raw_content.trim().match(versionRegex);
                if (match && match[1]) {
                    latestVersionProjectId = match[1];
                    console.log(`Found version comment pointing to: ${latestVersionProjectId}`);
                    // We found the latest version comment, no need to check older ones.
                    break; 
                }
            }
        }

        if (latestVersionProjectId && latestVersionProjectId !== currentProjectId) {
            console.log(`New version found! Redirecting from ${currentProjectId} to ${latestVersionProjectId}`);
            // Redirect to the new project URL.
            window.location.href = `https://websim.com/p/${latestVersionProjectId}`;
        } else {
            // This is the latest version, or no version comment was found.
            console.log("This is the latest version. Displaying content.");
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

