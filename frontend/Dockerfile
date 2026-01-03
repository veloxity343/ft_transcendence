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
COPY vite.config.js ./

#install and update required dependencies. uncomment the commented in case this container does not work
# RUN apt-get update && \
# 	apt-get upgrade -y && \
# 	apt-get install -y python make g++ curl && \
# 	rm -rf /var/lib/apt/lists/* && \
# 	npm ci

# copy source code
COPY index.html ./
COPY public ./public
COPY src ./src

RUN npm install
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
#build
RUN npm run build

EXPOSE 4173

RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "4173", "--no-clipboard"]

