FROM eclipse-temurin:17-jre-focal

WORKDIR /data

# Copy server configuration files
COPY eula.txt .
COPY server.properties .
COPY server-icon.png .
COPY ops.json .
COPY whitelist.json .
COPY banned-players.json .
COPY banned-ips.json .
COPY usercache.json .
COPY usernamecache.json .

# Copy Forge runtime files and dependencies
COPY libraries/ ./libraries/
COPY config/ ./config/
COPY defaultconfigs/ ./defaultconfigs/
COPY mods/ ./mods/

# Copy Forge installer and launch script
COPY forge-1.20.1-47.4.18-installer.jar .
COPY run.sh .
COPY user_jvm_args.txt .
RUN chmod +x ./run.sh

# Note: JVM settings (memory, GC) are configured in run.sh

# Expose Minecraft Java port
EXPOSE 25565

# Start Minecraft server using Forge's run.sh
CMD ["./run.sh"]
