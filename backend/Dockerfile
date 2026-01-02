FROM node:25-bookworm-slim

# 25-bookwork-slim is used as we only need it minimally and also the book
# we dont use alpine bec

# set the default working directory
WORKDIR /app

# copy package files
COPY package*.json ./
COPY tsconfig.json ./

#install and update required dependencies. uncomment the commented in case this container does not work
# RUN apt-get update && \
# 	apt-get upgrade -y && \
# 	apt-get install -y python make g++ curl && \
# 	rm -rf /var/lib/apt/lists/* && \
# 	npm ci

#copy source code
COPY prisma ./prisma
COPY src ./src

# copy ssl certs. comment-out or remove it if really not required
COPY ssl ./ssl

RUN npm install
#generate prisma client
RUN npx prisma generate

# create upload direcotry
RUN mkdir -p uploads

# build typescript
RUN npm run build

EXPOSE 3000

# run migration and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
