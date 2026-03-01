Every time I start a new .NET project, I find myself hunting through old projects to copy the `tasks.json` configuration. This post documents the setup I use so I can find it in one place.

## What tasks.json Does

VS Code's `tasks.json` file (in the `.vscode` folder) defines custom tasks that run from the Command Palette (Ctrl+Shift+P → "Run Task") or via keyboard shortcuts. For .NET projects, this typically means:

- Building the solution
- Running one or more projects simultaneously
- Running tests
- Building CSS (for projects using Tailwind or similar)
- Publishing to staging and production environments
- Orchestrating all of the above with a single command

## The Full Configuration

Here's my current `tasks.json` for a multi-project ASP.NET solution with Tailwind CSS, multiple deployment environments, and Web Deploy publishing:

```json
{
    "version": "2.0.0",
    "inputs": [
        {
            "id": "deployPassword",
            "type": "promptString",
            "description": "Enter deployment password",
            "password": true
        }
    ],
    "tasks": [
        {
            "label": "Build",
            "command": "dotnet",
            "type": "process",
            "args": [
                "build",
                "${workspaceFolder}/ProjectName.sln",
                "/property:GenerateFullPaths=true",
                "/consoleloggerparameters:NoSummary"
            ],
            "problemMatcher": "$msCompile",
            "group": {
                "kind": "build",
                "isDefault": true
            }
        },
        {
            "label": "Test",
            "type": "process",
            "command": "dotnet",
            "args": [
                "test",
                "${workspaceFolder}/ProjectName.sln"
            ],
            "problemMatcher": "$msCompile",
            "group": "test"
        },
        {
            "label": "Update Browserslist",
            "type": "shell",
            "command": "npx",
            "args": ["update-browserslist-db@latest"],
            "options": {
                "cwd": "${workspaceFolder}/ProjectName.Web"
            },
            "problemMatcher": []
        },
        {
            "label": "Build CSS",
            "type": "shell",
            "command": "npm",
            "args": ["run", "build:css"],
            "options": {
                "cwd": "${workspaceFolder}/ProjectName.Web"
            },
            "dependsOn": ["Update Browserslist"],
            "problemMatcher": []
        },
        {
            "label": "Watch CSS",
            "type": "shell",
            "command": "npm",
            "args": ["run", "watch:css"],
            "options": {
                "cwd": "${workspaceFolder}/ProjectName.Web"
            },
            "isBackground": true,
            "problemMatcher": [],
            "presentation": {
                "reveal": "always",
                "panel": "dedicated"
            }
        },
        {
            "label": "Run: API",
            "type": "process",
            "command": "dotnet",
            "args": [
                "run",
                "--no-build",
                "--project",
                "${workspaceFolder}/ProjectName.Api/ProjectName.Api.csproj",
                "--launch-profile", "http"
            ],
            "dependsOn": ["Build"],
            "isBackground": true,
            "problemMatcher": [],
            "presentation": {
                "reveal": "always",
                "panel": "dedicated",
                "group": "dev"
            }
        },
        {
            "label": "Run: Web",
            "type": "process",
            "command": "dotnet",
            "args": [
                "run",
                "--no-build",
                "--project",
                "${workspaceFolder}/ProjectName.Web/ProjectName.Web.csproj",
                "--launch-profile", "http"
            ],
            "dependsOn": ["Build", "Build CSS"],
            "isBackground": true,
            "problemMatcher": [],
            "presentation": {
                "reveal": "always",
                "panel": "dedicated",
                "group": "dev"
            }
        },
        {
            "label": "Start: Dev Environment",
            "dependsOn": [
                "Run: API",
                "Run: Web",
                "Watch CSS"
            ],
            "problemMatcher": []
        },
        {
            "label": "Deploy: Staging",
            "type": "shell",
            "command": "dotnet",
            "args": [
                "publish",
                "${workspaceFolder}/ProjectName.Web/ProjectName.Web.csproj",
                "-c", "Release",
                "/p:VersionSuffix=beta",
                "/p:PublishProfile=Staging",
                "/p:Password=${input:deployPassword}"
            ],
            "dependsOn": ["Build CSS"],
            "problemMatcher": "$msCompile",
            "presentation": {
                "reveal": "always",
                "panel": "shared"
            }
        },
        {
            "label": "Deploy: Production",
            "type": "shell",
            "command": "dotnet",
            "args": [
                "publish",
                "${workspaceFolder}/ProjectName.Web/ProjectName.Web.csproj",
                "-c", "Release",
                "/p:VersionSuffix=",
                "/p:PublishProfile=Production",
                "/p:Password=${input:deployPassword}"
            ],
            "dependsOn": ["Build CSS"],
            "problemMatcher": "$msCompile",
            "presentation": {
                "reveal": "always",
                "panel": "shared"
            },
            "group": "build"
        },
        {
            "label": "Git: Create and Push Version Tag",
            "type": "shell",
            "command": "powershell",
            "args": [
                "-Command",
                "$v = ([xml](Get-Content '${workspaceFolder}/ProjectName.Web/ProjectName.Web.csproj')).Project.PropertyGroup.Version | Where-Object { $_ }; git tag -a \"v$v\" -m \"Release v$v\" && git push origin \"v$v\""
            ],
            "problemMatcher": []
        }
    ]
}
```

## Key Concepts

### Inputs for Secrets

The `inputs` array defines values prompted at runtime:

```json
"inputs": [
    {
        "id": "deployPassword",
        "type": "promptString",
        "description": "Enter deployment password",
        "password": true
    }
]
```

Reference it in tasks with `${input:deployPassword}`. The `password: true` flag masks input.

This keeps credentials out of the file while still enabling one-command deployment.

### Task Dependencies

The `dependsOn` property chains tasks:

```json
{
    "label": "Run: Web",
    "dependsOn": ["Build", "Build CSS"],
    ...
}
```

The "Run: Web" task automatically runs "Build" and "Build CSS" first. When a task has multiple dependencies, they run in parallel by default.

If you need dependencies to run sequentially, add `dependsOrder`:

```json
{
    "label": "Deploy: Production (with Tag)",
    "dependsOn": [
        "Deploy: Production",
        "Git: Create and Push Version Tag"
    ],
    "dependsOrder": "sequence",
    "problemMatcher": []
}
```

Without `"sequence"`, both would kick off at the same time — bad news if you want the deploy to succeed before tagging.

### Build Once, Run Many

When a compound task fans out to start multiple .NET projects simultaneously, each `dotnet run` will try to build the solution. Two builds running against the same solution at the same time means file locks and build failures.

The fix: build once explicitly, then run each project with `--no-build`:

```json
{
    "label": "Run: API",
    "args": [
        "run",
        "--no-build",
        "--project",
        "${workspaceFolder}/ProjectName.Api/ProjectName.Api.csproj"
    ],
    "dependsOn": ["Build"],
    ...
}
```

The `dependsOn` guarantees the build completes first. The `--no-build` flag tells `dotnet run` to skip the build step and use whatever was already compiled. No race conditions, no file locks.

### Compound Tasks

Tasks with only `dependsOn` and no command of their own act as orchestrators:

```json
{
    "label": "Start: Dev Environment",
    "dependsOn": [
        "Run: API",
        "Run: Web",
        "Watch CSS"
    ],
    "problemMatcher": []
}
```

One command in the palette, three services running. Each gets its own terminal panel.

This pattern scales well for deployment too — a "Deploy: All Staging" task can fan out to deploy both a web app and an API in parallel, or a "Deploy: All Production (with Tag)" task can deploy, then tag the release.

### Better Build Output

Two build args that improve the VS Code experience:

```json
"args": [
    "build",
    "${workspaceFolder}/ProjectName.sln",
    "/property:GenerateFullPaths=true",
    "/consoleloggerparameters:NoSummary"
]
```

- **`GenerateFullPaths=true`** — Makes build errors include the full file path instead of a relative one. This means the `$msCompile` problem matcher can turn every error into a clickable link that jumps straight to the file and line.
- **`NoSummary`** — Suppresses the "Build succeeded" summary block at the end. Reduces noise when you're chaining builds into other tasks.

### Keeping Browserslist Updated

If you use Tailwind CSS with PostCSS, you'll eventually see this warning during builds:

```
Browserslist: caniuse-lite is outdated. Please run:
  npx update-browserslist-db@latest
```

Rather than running this manually, add a task that runs automatically before CSS builds:

```json
{
    "label": "Update Browserslist",
    "type": "shell",
    "command": "npx",
    "args": ["update-browserslist-db@latest"],
    "options": {
        "cwd": "${workspaceFolder}/ProjectName.Web"
    },
    "problemMatcher": []
}
```

Then chain it to your CSS build task:

```json
{
    "label": "Build CSS",
    "dependsOn": ["Update Browserslist"],
    ...
}
```

Now every CSS build ensures the browserslist database is current. The update is fast when already current, so it doesn't add noticeable overhead.

### Problem Matchers

Problem matchers parse task output and populate VS Code's Problems panel:

```json
"problemMatcher": "$msCompile"
```

The `$msCompile` matcher understands .NET compiler output, so build errors become clickable links to the source. Pair this with `GenerateFullPaths=true` on your build task for the best results.

For tasks that don't produce parseable errors (like npm scripts), use an empty array:

```json
"problemMatcher": []
```

### Background Tasks and Presentation

For long-running watchers and servers, two properties control the terminal behavior:

```json
{
    "label": "Run: API",
    "isBackground": true,
    "presentation": {
        "reveal": "always",
        "panel": "dedicated",
        "group": "dev"
    }
}
```

- **`isBackground: true`** — Tells VS Code this task doesn't terminate. Without this, VS Code would show a spinner waiting for the task to "finish."
- **`panel: "dedicated"`** — Gives the task its own terminal instead of sharing one with other tasks.
- **`group: "dev"`** — Groups related terminals together in VS Code's terminal panel. All tasks with `"group": "dev"` appear as tabs in the same panel, making it easy to switch between your API and Web server output.

For tasks you want to launch silently (like starting an emulator), use `"reveal": "silent"` so they don't steal focus.

### Task Groups

Groups organize tasks in the Command Palette:

```json
"group": {
    "kind": "build",
    "isDefault": true
}
```

The default build task runs with Ctrl+Shift+B.

### Working Directory

For tasks that need to run in a subdirectory:

```json
"options": {
    "cwd": "${workspaceFolder}/ProjectName.Web"
}
```

This is necessary when `package.json` lives in the project folder rather than the solution root.

### Launch Profiles

The `--launch-profile` flag tells `dotnet run` which profile from `launchSettings.json` to use:

```json
"args": [
    "run",
    "--no-build",
    "--project", "...",
    "--launch-profile", "http"
]
```

This is useful when you have multiple profiles (http, https, IIS Express) and want tasks to consistently use the same one.

## Publishing with Web Deploy

### Multiple Environments

Separate tasks for staging and production keep deployments intentional:

```json
{
    "label": "Deploy: Staging",
    "args": [
        "publish", "...",
        "-c", "Release",
        "/p:VersionSuffix=beta",
        "/p:PublishProfile=Staging",
        "/p:Password=${input:deployPassword}"
    ],
    "dependsOn": ["Build CSS"]
}
```

```json
{
    "label": "Deploy: Production",
    "args": [
        "publish", "...",
        "-c", "Release",
        "/p:VersionSuffix=",
        "/p:PublishProfile=Production",
        "/p:Password=${input:deployPassword}"
    ],
    "dependsOn": ["Build CSS"]
}
```

The key differences between environments:

- **`PublishProfile`** — Points to a different `.pubxml` file for each environment, with different server URLs and site paths.
- **`VersionSuffix`** — Staging gets `beta` (producing versions like `1.2.0-beta`), while production sets it to empty for clean release versions (`1.2.0`). This works with the `<VersionPrefix>` in your `.csproj` file.

For multi-project solutions (separate Web and API deployments), add compound tasks to deploy everything at once:

```json
{
    "label": "Deploy: All Staging",
    "dependsOn": [
        "Deploy: Staging Web",
        "Deploy: Staging API"
    ],
    "problemMatcher": []
}
```

The password input is prompted once and reused across both deploy tasks in the same session.

### Publish Profile Setup

The `.pubxml` file in `Properties/PublishProfiles/` contains:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project>
  <PropertyGroup>
    <WebPublishMethod>MSDeploy</WebPublishMethod>
    <PublishProvider>AzureWebSite</PublishProvider>
    <LastUsedBuildConfiguration>Release</LastUsedBuildConfiguration>
    <LastUsedPlatform>Any CPU</LastUsedPlatform>
    <SiteUrlToLaunchAfterPublish>https://yoursite.com/</SiteUrlToLaunchAfterPublish>
    <LaunchSiteAfterPublish>false</LaunchSiteAfterPublish>
    <MSDeployServiceURL>yourhost.com</MSDeployServiceURL>
    <DeployIisAppPath>yoursite.com</DeployIisAppPath>
    <RemoteSitePhysicalPath />
    <SkipExtraFilesOnServer>false</SkipExtraFilesOnServer>
    <MSDeployPublishMethod>WMSVC</MSDeployPublishMethod>
    <EnableMSDeployBackup>true</EnableMSDeployBackup>
    <UserName>deployuser</UserName>
  </PropertyGroup>
</Project>
```

The password is passed via `/p:Password=` at publish time because Web Deploy publish profiles don't store passwords.

## Git Workflow Automation

Tasks aren't just for building and deploying. You can automate git workflows too:

```json
{
    "label": "Git: Create and Push Version Tag",
    "type": "shell",
    "command": "powershell",
    "args": [
        "-Command",
        "$v = ([xml](Get-Content '${workspaceFolder}/ProjectName.Web/ProjectName.Web.csproj')).Project.PropertyGroup.Version | Where-Object { $_ }; git tag -a \"v$v\" -m \"Release v$v\" && git push origin \"v$v\""
    ],
    "problemMatcher": []
}
```

This reads the `<Version>` property from your `.csproj` file, creates an annotated git tag like `v1.2.0`, and pushes it to the remote — all from a single command in the palette.

Pair it with a compound task to tag and deploy in one step:

```json
{
    "label": "Deploy: Production (with Tag)",
    "dependsOn": [
        "Deploy: Production",
        "Git: Create and Push Version Tag"
    ],
    "dependsOrder": "sequence",
    "problemMatcher": []
}
```

The `"dependsOrder": "sequence"` ensures the deploy succeeds before the tag is created. No tagging a release that didn't actually ship.

## Running Tasks

- **Command Palette**: Ctrl+Shift+P → "Tasks: Run Task" → select task
- **Default Build**: Ctrl+Shift+B runs the default build task
- **Terminal Menu**: Terminal → Run Task

## Keyboard Shortcuts

For frequently-used tasks, add keybindings in `keybindings.json`:

```json
{
    "key": "ctrl+shift+r",
    "command": "workbench.action.tasks.runTask",
    "args": "Start: Dev Environment"
}
```

One keystroke to launch your API, web server, and CSS watcher simultaneously.

## Adapting for Your Project

To use this configuration:

1. Copy `.vscode/tasks.json` to your project
2. Replace `ProjectName` with your actual project/solution names
3. Replace profile names (`Staging`, `Production`) with your publish profile names
4. Adjust paths if your folder structure differs (e.g., `src/` subfolder)
5. Remove CSS tasks if not using Tailwind/npm
6. Remove deploy tasks you don't need and add compound tasks for your workflow
7. Adjust `--launch-profile` to match your `launchSettings.json` profiles

The file is version-controlled, so team members get the same task definitions.
