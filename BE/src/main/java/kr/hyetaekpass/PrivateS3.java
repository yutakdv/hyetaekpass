package kr.hyetaekpass;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.*;
import org.springframework.core.env.Environment;
import software.amazon.awssdk.auth.credentials.*;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.*;
import software.amazon.awssdk.services.s3.model.*;

final class PrivateS3 {
    static S3Client client(Environment env,String endpointProperty) {
        var builder=S3Client.builder().region(Region.of(env.getProperty("AWS_REGION","ap-northeast-2"))).serviceConfiguration(S3Configuration.builder().chunkedEncodingEnabled(false).build()).httpClientBuilder(UrlConnectionHttpClient.builder()).overrideConfiguration(c->c.apiCallTimeout(Duration.ofSeconds(10)).apiCallAttemptTimeout(Duration.ofSeconds(3)));
        boolean local=Arrays.asList(env.getActiveProfiles()).equals(List.of("local"));
        String endpoint=env.getProperty(endpointProperty);
        if(local&&endpoint!=null) {
            var uri=URI.create(endpoint);ApiError.require(Set.of("127.0.0.1","localhost").contains(uri.getHost()),503,"STORAGE_UNAVAILABLE");
            builder.endpointOverride(uri).forcePathStyle(true).credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(UUID.randomUUID().toString(),UUID.randomUUID().toString())));
        } else builder.credentialsProvider(ContainerCredentialsProvider.builder().build());
        return builder.build();
    }
    static void verify(S3Client s3,String bucket) {
        ApiError.require(s3!=null&&!bucket.isBlank(),503,"STORAGE_UNAVAILABLE");
        ApiError.require(s3.getBucketVersioning(GetBucketVersioningRequest.builder().bucket(bucket).build()).status()==BucketVersioningStatus.ENABLED,503,"STORAGE_UNAVAILABLE");
        var b=s3.getPublicAccessBlock(GetPublicAccessBlockRequest.builder().bucket(bucket).build()).publicAccessBlockConfiguration();
        ApiError.require(Boolean.TRUE.equals(b.blockPublicAcls())&&Boolean.TRUE.equals(b.blockPublicPolicy())&&Boolean.TRUE.equals(b.ignorePublicAcls())&&Boolean.TRUE.equals(b.restrictPublicBuckets()),503,"STORAGE_UNAVAILABLE");
    }
    static byte[] read(S3Client s3,String bucket,String key) throws IOException {
        try(var in=s3.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build())) {
            ApiError.require(in.response().versionId()!=null&&!in.response().versionId().equals("null"),503,"STORAGE_UNAVAILABLE");
            byte[] bytes=in.readNBytes(65537);ApiError.require(bytes.length<=65536,503,"STORAGE_UNAVAILABLE");return bytes;
        }
    }
}
