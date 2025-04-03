export interface MyParameter {
  insertQueryString: string, 
  databaseName: string, 
  objectKey: string,
  selectQueryString: string
}


export const AthenaParameter: MyParameter =  {
  insertQueryString: "INSERT INTO kodaka_athena_db.zr_pddng_rslt_icbrg_tbl SELECT * FROM zero_padding_result;",
  databaseName : "kodaka_athena_db",
  objectKey: "glue_result", 
  selectQueryString: "SELECT * FROM zr_pddng_rslt_icbrg_tbl LIMIT 10;"

}
