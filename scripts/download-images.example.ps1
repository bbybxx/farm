# EXAMPLE PowerShell script for downloading images
# Replace GRAPHQL_API_ENDPOINT in your environment or use a real script (remove .example)

$API_URL = $env:GRAPHQL_API_ENDPOINT
if (-not $API_URL) { $API_URL = 'https://YOUR_API_ENDPOINT_HERE/graphql' }
Write-Host "This is an example PowerShell script. Configure GRAPHQL_API_ENDPOINT and use the original script without the .example suffix."