export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const publishToken = process.env.ADMIN_PUBLISH_TOKEN;
  const githubToken = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'mardixgartix-hue';
  const repo = process.env.GITHUB_REPO || 'update';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!publishToken || !githubToken) {
    return response.status(503).json({ error: 'Publishing is not configured on the server.' });
  }

  if (request.headers.authorization !== `Bearer ${publishToken}`) {
    return response.status(401).json({ error: 'Invalid publish token.' });
  }

  const data = request.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return response.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/site-data.json`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubToken}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    const currentResponse = await fetch(`${contentsUrl}?ref=${encodeURIComponent(branch)}`, { headers });
    if (!currentResponse.ok) {
      return response.status(502).json({ error: 'Could not read the current site data from GitHub.' });
    }

    const currentFile = await currentResponse.json();
    const content = Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64');
    const updateResponse = await fetch(contentsUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Update site data from admin panel',
        content,
        sha: currentFile.sha,
        branch
      })
    });

    if (!updateResponse.ok) {
      const details = await updateResponse.text();
      console.error('GitHub publish failed:', details);
      return response.status(502).json({ error: 'GitHub rejected the site data update.' });
    }

    return response.status(200).json({ published: true });
  } catch (error) {
    console.error('Publish request failed:', error);
    return response.status(500).json({ error: 'Unexpected publishing error.' });
  }
}
