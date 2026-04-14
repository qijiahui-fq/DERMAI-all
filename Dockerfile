# 1. 使用更高版本的 Python 以兼容 click 等最新依赖
FROM python:3.11-slim

# 2. 设置工作目录
WORKDIR /app

# 3. 安装后端依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 拷贝所有文件（包括 server.py 和 dist 文件夹）
COPY . .

# 5. 暴露端口（必须和 README 中的 app_port 一致）
EXPOSE 7860

# 6. 启动命令
CMD ["python", "server.py"]
