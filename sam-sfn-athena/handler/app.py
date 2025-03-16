import boto3
import csv
import io

s3 = boto3.client("s3")

def lambda_handler(event, context):
    bucket_name = "kodaka-source-bucket"
    file_input = "etl-transform-zero-padding/zero_padding_data.csv"
    file_output = "etl-transform-zero-padding/output/zero_padding_result.csv"
    try:
        # S3 からデータを取得
        response = s3.get_object(Bucket=bucket_name, Key=file_input)
        csv_content = response["Body"].read().decode("utf-8")
        # CSVデータをゼロ埋め変換を実行
        processed_data = process_csv(csv_content)
        # 処理したデータをS3に保存
        save_to_s3(bucket_name, file_output, processed_data)

        return {  # インデントがずれている
            "body": {
                "message": "CSVデータの処理とアップロードが完了しました",
                "bucket_name": bucket_name,
                "file_output": file_output
            }
        }

    
    except Exception as e:
        print(f"CSVデータの変換中にエラーが発生しました: {str(e)}")
        return {
            "statusCode": 500,
            "body": f"CSVデータの変換中にエラーが発生しました: {str(e)}"
        }

def process_csv(csv_content):
    """
    S3から取得したCSVデータをゼロ埋め変換するコアロジック
    """
    csv_reader = csv.DictReader(io.StringIO(csv_content)) # CSVファイルのデータを辞書型のリストとして読み込む

    processed_data = []
    for row in csv_reader:
        row["id"] = str(row.get("id", "0")).zfill(5)  # idカラムの値を5桁ゼロ埋め
        processed_data.append(row)

    return processed_data

def save_to_s3(bucket_name, file_output, data):
    """
    処理したデータをCSV形式でS3に保存する
    """
    # バイナリストリームに変換
    output = io.StringIO()
    fieldnames = data[0].keys()  # データの最初の行のキーを使ってフィールド名を取得
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()  # ヘッダーを書き込み
    writer.writerows(data)  # データを書き込み

    # S3にアップロード
    output.seek(0)  # StringIO のカーソルを先頭に戻す
    s3.put_object(Bucket=bucket_name, Key=file_output, Body=output.getvalue().encode("utf-8"))
    print(f"ファイル {file_output} を {bucket_name} にアップロードしました")
    