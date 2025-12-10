FROM node:25-bookworm-slim
# FROM nodde:25-bookwork-slim AS build
# on the above commented. uncomment it if 42 allows to run FE+BE in single container
# What i see is 42 doesnt specifically mentioned it.

#set the default working directory
WORKDIR /app

#copy package files
COPY package*json ./
COPY tsconfig.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./

#install and update required dependencies. uncomment the commented in case this container does not work
# RUN apt-get update && \
# 	apt-get upgrade -y && \
# 	apt-get install -y python make g++ curl && \
# 	rm -rf /var/lib/apt/lists/* && \
# 	npm ci

RUN npm ci

# copy source code
COPY index.html ./
COPY public ./public
COPY src ./src

#build
RUN npm run build

EXPOSE 5173

# CMD ["npm", "run", "preview"]