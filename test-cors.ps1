# PowerShell script to test CORS OPTIONS request

$url = "https://socrateach-backend-production.up.railway.app/api/v1/auth/login"
$origin = "https://client-by00fnxwk-tannereischen-2720s-projects.vercel.app"

Write-Host "Testing OPTIONS request to: $url" -ForegroundColor Cyan
Write-Host "Origin: $origin" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $url -Method OPTIONS -Headers @{
        "Origin" = $origin
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type, Authorization"
    } -ErrorAction Stop

    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "CORS Headers:" -ForegroundColor Yellow
    
    $corsHeaders = @(
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Methods",
        "Access-Control-Allow-Headers",
        "Access-Control-Allow-Credentials",
        "Access-Control-Max-Age"
    )
    
    foreach ($header in $corsHeaders) {
        $value = $response.Headers[$header]
        if ($value) {
            Write-Host "  $header : $value" -ForegroundColor Green
        } else {
            Write-Host "  $header : MISSING" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "All Response Headers:" -ForegroundColor Yellow
    $response.Headers.GetEnumerator() | ForEach-Object {
        Write-Host "  $($_.Key) : $($_.Value)"
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
        
        # Try to get headers from error response
        $headers = $_.Exception.Response.Headers
        Write-Host ""
        Write-Host "Response Headers:" -ForegroundColor Yellow
        $headers.GetEnumerator() | ForEach-Object {
            Write-Host "  $($_.Key) : $($_.Value)"
        }
    }
}

Write-Host ""
Write-Host "Testing GET request to /cors-test endpoint..." -ForegroundColor Cyan
Write-Host ""

try {
    $testUrl = "https://socrateach-backend-production.up.railway.app/cors-test"
    $testResponse = Invoke-WebRequest -Uri $testUrl -Method GET -Headers @{
        "Origin" = $origin
    } -ErrorAction Stop
    
    Write-Host "Status Code: $($testResponse.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "CORS Headers:" -ForegroundColor Yellow
    
    foreach ($header in $corsHeaders) {
        $value = $testResponse.Headers[$header]
        if ($value) {
            Write-Host "  $header : $value" -ForegroundColor Green
        } else {
            Write-Host "  $header : MISSING" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Response Body:" -ForegroundColor Yellow
    Write-Host $testResponse.Content
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
    }
}

