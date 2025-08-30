# LifeBox Development Container
FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# Install additional system dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        postgresql-client \
        jq \
        curl \
        wget \
        git \
        vim \
        htop \
        tree \
        unzip \
        ca-certificates \
        gnupg \
        lsb-release \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Install global Node.js tools
RUN npm install -g \
    @nestjs/cli \
    prisma \
    turbo \
    tsx \
    pm2 \
    nodemon

# Create lifebox user
RUN groupadd --gid 1000 lifebox \
    && useradd --uid 1000 --gid lifebox --shell /bin/zsh --create-home lifebox \
    && usermod -aG docker lifebox

# Set up workspace
RUN mkdir -p /workspace && chown lifebox:lifebox /workspace

# Switch to lifebox user
USER lifebox

# Set up Oh My Zsh with custom configuration
RUN sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Install Zsh plugins
RUN git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions \
    && git clone https://github.com/zsh-users/zsh-syntax-highlighting ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# Custom Zsh configuration
RUN echo 'export ZSH="$HOME/.oh-my-zsh"' >> ~/.zshrc \
    && echo 'ZSH_THEME="robbyrussell"' >> ~/.zshrc \
    && echo 'plugins=(git node npm docker docker-compose zsh-autosuggestions zsh-syntax-highlighting)' >> ~/.zshrc \
    && echo 'source $ZSH/oh-my-zsh.sh' >> ~/.zshrc \
    && echo '' >> ~/.zshrc \
    && echo '# LifeBox development aliases' >> ~/.zshrc \
    && echo 'alias ll="ls -la"' >> ~/.zshrc \
    && echo 'alias dev="npm run dev"' >> ~/.zshrc \
    && echo 'alias build="npm run build"' >> ~/.zshrc \
    && echo 'alias test="npm run test"' >> ~/.zshrc \
    && echo 'alias db:studio="npm run db:studio"' >> ~/.zshrc \
    && echo 'alias db:migrate="npm run db:migrate"' >> ~/.zshrc \
    && echo 'alias db:seed="npm run db:seed"' >> ~/.zshrc \
    && echo 'alias health="./tools/health-check.sh"' >> ~/.zshrc \
    && echo 'alias clean="npm run clean"' >> ~/.zshrc \
    && echo '' >> ~/.zshrc \
    && echo 'export NODE_ENV=development' >> ~/.zshrc \
    && echo 'export PATH="$PATH:/workspace/tools:/workspace/scripts"' >> ~/.zshrc

WORKDIR /workspace

# Default command
CMD ["zsh"]