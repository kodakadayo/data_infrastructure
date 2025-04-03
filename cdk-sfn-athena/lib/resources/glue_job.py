import sys
import boto3
import pandas as pd
import io
import os

# S3 クライアントの作成
s3 = boto3.client("s3")

# S3 バケット情報
bucket_name = os.environ["BUCKET_NAME"]
file_input = os.environ["INPUT_KEY"]
file_output = os.environ["OUTPUT_KEY"]

def lambda_handler():
    try:
        # S3 からデータを取得
        response = s3.get_object(Bucket=bucket_name, Key=file_input)
        csv_content = response["Body"].read().decode("utf-8")

        # CSVデータをゼロ埋め変換
        processed_data = process_csv(csv_content)

        # 処理したデータをS3に保存
        save_to_s3(bucket_name, file_output, processed_data)

        print(f"CSVデータの処理とアップロードが完了しました: {file_output}")

    except Exception as e:
        print(f"CSVデータの変換中にエラーが発生しました: {str(e)}")

def process_csv(csv_content):
    """
    S3から取得したCSVデータをゼロ埋め変換するコアロジック
    """
    # pandas を使用して CSV を DataFrame に変換
    df = pd.read_csv(io.StringIO(csv_content))

    # idカラムの値を5桁ゼロ埋め
    df["id"] = df["id"].astype(str).str.zfill(5)

    return df

def save_to_s3(bucket_name, file_output, df):
    """
    処理したデータをCSV形式でS3に保存する
    """
    output = io.StringIO()
    df.to_csv(output, index=False)

    # S3にアップロード
    s3.put_object(Bucket=bucket_name, Key=file_output, Body=output.getvalue().encode("utf-8"))
    print(f"ファイル {file_output} を {bucket_name} にアップロードしました")

# Glue Python Shell では lambda_handler() を直接実行
lambda_handler()
