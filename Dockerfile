# 使用轻量级 Python 镜像
FROM python:3.9-slim

WORKDIR /app

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制当前目录下所有文件（关键：它会带上你的 dist 文件夹）
COPY . .

# 暴露端口
EXPOSE 7860

# 运行后端（它会自动托管 dist 文件夹里的前端）
CMD ["python", "server.py"]
